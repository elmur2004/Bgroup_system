import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'

export async function POST(
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
    const now = new Date()

    const lr = await prisma.hrLeaveRequest.findUnique({
      where: { id: pk },
      include: { employee: true, leaveType: true },
    })
    if (!lr) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (lr.status !== 'pending') {
      return NextResponse.json({ detail: 'Leave request is not pending.' }, { status: 400 })
    }

    // Update leave request status
    await prisma.hrLeaveRequest.update({
      where: { id: pk },
      data: {
        status: 'denied',
        updatedAt: now,
      },
    })

    // Create notification for the employee
    if (lr.employee?.userId) {
      await prisma.hrNotification.create({
        data: {
          userId: lr.employee.userId,
          notificationType: 'leave',
          title: 'Leave Request Denied',
          message: `Your ${lr.leaveType?.nameEn || 'leave'} request from ${lr.startDate.toISOString().split('T')[0]} to ${lr.endDate.toISOString().split('T')[0]} has been denied.`,
          isRead: false,
          relatedObjectType: 'leave_request',
          relatedObjectId: lr.id,
          createdAt: now,
        },
      })
    }

    // Return updated leave request
    const updated = await prisma.hrLeaveRequest.findUnique({
      where: { id: pk },
      include: { employee: true, leaveType: true, approvedBy: true },
    })

    return NextResponse.json({
      id: updated!.id,
      employee: updated!.employeeId,
      employee_name: updated!.employee?.fullNameEn || '',
      leave_type: updated!.leaveTypeId,
      leave_type_name: updated!.leaveType?.nameEn || '',
      start_date: updated!.startDate.toISOString().split('T')[0],
      end_date: updated!.endDate.toISOString().split('T')[0],
      days_count: updated!.daysCount,
      reason: updated!.reason,
      status: updated!.status,
      approved_by: updated!.approvedById,
      approved_by_name: updated!.approvedBy
        ? `${updated!.approvedBy.firstName} ${updated!.approvedBy.lastName}`.trim()
        : null,
      approved_at: updated!.approvedAt ? updated!.approvedAt.toISOString() : null,
      created_at: updated!.createdAt.toISOString(),
      updated_at: updated!.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave deny error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
