import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin, hasAnyRole } from '@/lib/hr/permissions'
import { createOvertimeRequestSchema } from '@/lib/hr/validations'

const overtimeRequestIncludes = {
  employee: {
    include: {
      company: true,
      department: true,
    },
  },
  overtimePolicy: true,
  approvedBy: true,
}

function serializeOvertimeRequest(r: any) {
  return {
    id: r.id,
    employee: r.employeeId,
    employee_name: r.employee?.fullNameEn || '',
    employee_id_str: r.employee?.employeeId || '',
    department_name: r.employee?.department?.nameEn || '',
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
    overtime_type: r.overtimeTypeId,
    overtime_type_name: r.overtimePolicy?.nameEn || '',
    rate_multiplier: r.overtimePolicy ? parseFloat(r.overtimePolicy.rateMultiplier) : null,
    hours_requested: parseFloat(r.hoursRequested),
    reason: r.reason,
    evidence: r.evidence || null,
    status: r.status,
    approved_by: r.approvedById,
    approved_by_name: r.approvedBy
      ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}`.trim()
      : null,
    approved_at: r.approvedAt ? r.approvedAt.toISOString() : null,
    denial_reason: r.denialReason || '',
    calculated_amount: parseFloat(r.calculatedAmount),
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)

    const where: any = {}

    const employee = url.searchParams.get('employee')
    const status = url.searchParams.get('status')
    const company = url.searchParams.get('company')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    if (employee) where.employeeId = employee
    if (status) where.status = status
    if (company) where.employee = { ...where.employee, companyId: company }
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) }
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) }

    // Non-privileged users can only see their own requests
    if (!hasAnyRole(authUser, ['super_admin', 'hr_manager', 'accountant', 'ceo'])) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!emp) return NextResponse.json([])
      where.employeeId = emp.id
    }

    const requests = await prisma.hrOvertimeRequest.findMany({
      where,
      include: overtimeRequestIncludes,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(requests.map(serializeOvertimeRequest))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime requests list error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const body = await request.json()
    const parsed = createOvertimeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    let employeeId = data.employee ? data.employee : null
    const callerEmp = await prisma.hrEmployee.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    })

    // Non-HR users may only submit overtime for themselves
    if (!isHROrAdmin(authUser)) {
      if (!callerEmp) {
        return NextResponse.json({ detail: 'No employee profile found for this user.' }, { status: 400 })
      }
      if (employeeId && employeeId !== callerEmp.id) {
        return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
      }
      employeeId = callerEmp.id
    } else if (!employeeId) {
      if (!callerEmp) {
        return NextResponse.json({ detail: 'No employee profile found for this user.' }, { status: 400 })
      }
      employeeId = callerEmp.id
    }

    // Validate hours against policy
    const overtimeTypeId = data.overtime_type
    const policy = await prisma.hrOvertimePolicy.findUnique({ where: { id: overtimeTypeId } })
    if (!policy) {
      return NextResponse.json({ detail: 'Overtime policy not found.' }, { status: 400 })
    }

    const hoursRequested = parseFloat(String(data.hours_requested))
    if (hoursRequested < parseFloat(String(policy.minHours))) {
      return NextResponse.json(
        { hours_requested: `Minimum hours for this OT type is ${policy.minHours}.` },
        { status: 400 }
      )
    }
    if (hoursRequested > parseFloat(String(policy.maxHoursPerDay))) {
      return NextResponse.json(
        { hours_requested: `Maximum hours per day for this OT type is ${policy.maxHoursPerDay}.` },
        { status: 400 }
      )
    }

    // Validate date: no future dates (compare date strings to avoid timezone issues)
    const otDateStr = data.date
    const todayStr = new Date().toISOString().split('T')[0]
    if (otDateStr > todayStr) {
      return NextResponse.json({ detail: 'Cannot submit overtime for future dates.' }, { status: 400 })
    }
    // Validate date: within 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
    if (otDateStr < sevenDaysAgoStr) {
      return NextResponse.json({ detail: 'Cannot submit overtime for dates older than 7 days.' }, { status: 400 })
    }

    // Validate reason minimum length
    if (!data.reason || data.reason.trim().length < 20) {
      return NextResponse.json({ detail: 'Reason must be at least 20 characters.' }, { status: 400 })
    }

    const otRequest = await prisma.hrOvertimeRequest.create({
      data: {
        employeeId: employeeId!,
        overtimeTypeId,
        date: new Date(data.date),
        hoursRequested,
        reason: data.reason || '',
        evidence: data.evidence || null,
        status: 'pending',
        denialReason: '',
        calculatedAmount: 0,
        createdAt: now,
        updatedAt: now,
      },
      include: overtimeRequestIncludes,
    })

    // Notify HR managers
    const hrUsers = await prisma.hrUserProfile.findMany({
      where: {
        roles: { some: { role: { name: { in: ['hr_manager', 'super_admin'] } } } },
        isActive: true,
      },
    })
    const employee = await prisma.hrEmployee.findUnique({ where: { id: employeeId! } })
    for (const hrUser of hrUsers) {
      await prisma.hrNotification.create({
        data: {
          userId: hrUser.userId,
          notificationType: 'ot_submitted',
          title: 'New Overtime Request',
          message: `${employee?.fullNameEn || 'Employee'} submitted an OT request for ${data.date} (${hoursRequested}h).`,
          isRead: false,
          relatedObjectType: 'OvertimeRequest',
          relatedObjectId: otRequest.id,
          createdAt: now,
        },
      })
    }

    return NextResponse.json(serializeOvertimeRequest(otRequest), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime request create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
