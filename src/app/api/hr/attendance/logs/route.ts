import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createAttendanceLogSchema } from '@/lib/hr/validations'

function serializeLog(log: any) {
  return {
    id: log.id,
    employee: log.employeeId,
    employee_name: log.employee?.fullNameEn || '',
    employee_id_str: log.employee?.employeeId || '',
    date: log.date.toISOString().split('T')[0],
    check_in: log.checkIn,
    check_out: log.checkOut,
    status: log.status,
    hours_worked: Number(log.hoursWorked),
    overtime_hours: Number(log.overtimeHours),
    is_manual: log.isManual,
    manual_reason: log.manualReason,
    created_by: log.createdById,
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)

    const where: any = {}
    const employee = url.searchParams.get('employee')
    const status = url.searchParams.get('status')
    const date = url.searchParams.get('date')
    const isManual = url.searchParams.get('is_manual')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const company = url.searchParams.get('company')
    const search = url.searchParams.get('search')

    if (employee) where.employeeId = employee
    if (status) where.status = status
    if (date) where.date = new Date(date)
    if (isManual !== null && isManual !== '') where.isManual = isManual === 'true'

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    if (company) {
      where.employee = { ...where.employee, companyId: company }
    }

    if (search) {
      where.employee = {
        ...where.employee,
        OR: [
          { fullNameEn: { contains: search } },
          { fullNameAr: { contains: search } },
          { employeeId: { contains: search } },
        ],
      }
    }

    // Non-HR users can only see their own logs
    if (!isHROrAdmin(authUser)) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!emp) {
        return NextResponse.json([])
      }
      where.employeeId = emp.id
    }

    const logs = await prisma.hrAttendanceLog.findMany({
      where,
      include: { employee: true },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(logs.map(serializeLog))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Attendance logs list error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createAttendanceLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const log = await prisma.hrAttendanceLog.create({
      data: {
        employeeId: data.employee,
        date: new Date(data.date),
        checkIn: data.check_in || null,
        checkOut: data.check_out || null,
        status: data.status || 'on_time',
        hoursWorked: data.hours_worked !== undefined ? parseFloat(String(data.hours_worked)) || 0 : 0,
        overtimeHours: data.overtime_hours !== undefined ? parseFloat(String(data.overtime_hours)) || 0 : 0,
        isManual: true,
        manualReason: data.manual_reason || '',
        createdById: authUser.id,
        createdAt: now,
        updatedAt: now,
      },
      include: { employee: true },
    })

    return NextResponse.json(serializeLog(log), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Attendance log create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
