import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createLeaveRequestSchema } from '@/lib/hr/validations'

function serializeLeaveRequest(lr: any) {
  return {
    id: lr.id,
    employee: lr.employeeId,
    employee_name: lr.employee?.fullNameEn || '',
    leave_type: lr.leaveTypeId,
    leave_type_name: lr.leaveType?.nameEn || '',
    start_date: lr.startDate.toISOString().split('T')[0],
    end_date: lr.endDate.toISOString().split('T')[0],
    days_count: lr.daysCount,
    reason: lr.reason,
    status: lr.status,
    approved_by: lr.approvedById,
    approved_by_name: lr.approvedBy
      ? `${lr.approvedBy.firstName} ${lr.approvedBy.lastName}`.trim()
      : null,
    approved_at: lr.approvedAt ? lr.approvedAt.toISOString() : null,
    created_at: lr.createdAt.toISOString(),
    updated_at: lr.updatedAt.toISOString(),
  }
}

const leaveRequestIncludes = {
  employee: true,
  leaveType: true,
  approvedBy: true,
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)

    const where: any = {}
    const employee = url.searchParams.get('employee')
    const leaveType = url.searchParams.get('leave_type')
    const status = url.searchParams.get('status')

    if (employee) where.employeeId = employee
    if (leaveType) where.leaveTypeId = leaveType
    if (status) where.status = status

    // Non-HR users can only see their own leave requests
    if (!isHROrAdmin(authUser)) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!emp) {
        return NextResponse.json([])
      }
      where.employeeId = emp.id
    }

    const leaveRequests = await prisma.hrLeaveRequest.findMany({
      where,
      include: leaveRequestIncludes,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(leaveRequests.map(serializeLeaveRequest))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave requests list error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const body = await request.json()
    const parsed = createLeaveRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    let employeeId = data.employee ? data.employee : null

    // Auto-fill employee from logged-in user if not provided
    if (!employeeId) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!emp) {
        return NextResponse.json({ detail: 'No employee profile found for this user.' }, { status: 400 })
      }
      employeeId = emp.id
    }

    // Only HR can create leave requests for other employees
    if (!isHROrAdmin(authUser)) {
      const emp = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!emp || emp.id !== employeeId) {
        return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
      }
    }

    const startDate = new Date(data.start_date)
    const endDate = new Date(data.end_date)
    const daysCount = data.days_count || Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const leaveRequest = await prisma.hrLeaveRequest.create({
      data: {
        employeeId: employeeId!,
        leaveTypeId: data.leave_type,
        startDate,
        endDate,
        daysCount,
        reason: data.reason || '',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      include: leaveRequestIncludes,
    })

    return NextResponse.json(serializeLeaveRequest(leaveRequest), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave request create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
