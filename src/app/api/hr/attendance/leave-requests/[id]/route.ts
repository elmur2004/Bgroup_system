import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateLeaveRequestSchema } from '@/lib/hr/validations'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params

    const lr = await prisma.hrLeaveRequest.findUnique({
      where: { id: id },
      include: leaveRequestIncludes,
    })
    if (!lr) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (!isHROrAdmin(authUser)) {
      const ownEmp = await prisma.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      })
      if (!ownEmp || lr.employeeId !== ownEmp.id) {
        return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
      }
    }

    return NextResponse.json(serializeLeaveRequest(lr))
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
    const parsed = updateLeaveRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.leave_type !== undefined) updateData.leaveTypeId = data.leave_type
    if (data.start_date !== undefined) updateData.startDate = new Date(data.start_date)
    if (data.end_date !== undefined) updateData.endDate = new Date(data.end_date)
    if (data.days_count !== undefined) updateData.daysCount = data.days_count
    if (data.reason !== undefined) updateData.reason = data.reason
    if (data.status !== undefined) updateData.status = data.status

    await prisma.hrLeaveRequest.update({ where: { id: pk }, data: updateData })

    const lr = await prisma.hrLeaveRequest.findUnique({
      where: { id: pk },
      include: leaveRequestIncludes,
    })

    return NextResponse.json(serializeLeaveRequest(lr!))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave request update error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
