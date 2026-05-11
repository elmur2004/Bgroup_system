import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateAttendanceLogSchema } from '@/lib/hr/validations'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params

    const log = await prisma.hrAttendanceLog.findUnique({
      where: { id: id },
      include: { employee: true },
    })
    if (!log) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeLog(log))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const pk = id
    const body = await request.json()
    const parsed = updateAttendanceLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.check_in !== undefined) updateData.checkIn = data.check_in
    if (data.check_out !== undefined) updateData.checkOut = data.check_out
    if (data.status !== undefined) updateData.status = data.status
    if (data.hours_worked !== undefined) updateData.hoursWorked = parseFloat(String(data.hours_worked))
    if (data.overtime_hours !== undefined) updateData.overtimeHours = parseFloat(String(data.overtime_hours))
    if (data.manual_reason !== undefined) updateData.manualReason = data.manual_reason
    if (data.date !== undefined) updateData.date = new Date(data.date)

    await prisma.hrAttendanceLog.update({ where: { id: pk }, data: updateData })

    const log = await prisma.hrAttendanceLog.findUnique({
      where: { id: pk },
      include: { employee: true },
    })

    return NextResponse.json(serializeLog(log!))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Attendance log update error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
