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
        status: 'approved',
        approvedById: authUser.id,
        approvedAt: now,
        updatedAt: now,
      },
    })

    // Create attendance logs with status 'leave' for each day of the leave
    const startDate = new Date(lr.startDate)
    const endDate = new Date(lr.endDate)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const logDate = new Date(d)
      logDate.setHours(0, 0, 0, 0)

      // Skip if log already exists for this day
      const existing = await prisma.hrAttendanceLog.findUnique({
        where: { employeeId_date: { employeeId: lr.employeeId, date: logDate } },
      })

      if (!existing) {
        await prisma.hrAttendanceLog.create({
          data: {
            employeeId: lr.employeeId,
            date: logDate,
            status: 'leave',
            hoursWorked: 0,
            overtimeHours: 0,
            isManual: false,
            manualReason: '',
            createdAt: now,
            updatedAt: now,
          },
        })
      } else {
        await prisma.hrAttendanceLog.update({
          where: { id: existing.id },
          data: { status: 'leave', updatedAt: now },
        })
      }
    }

    // Create notification for the employee
    if (lr.employee?.userId) {
      await prisma.hrNotification.create({
        data: {
          userId: lr.employee.userId,
          notificationType: 'leave',
          title: 'Leave Request Approved',
          message: `Your ${lr.leaveType?.nameEn || 'leave'} request from ${lr.startDate.toISOString().split('T')[0]} to ${lr.endDate.toISOString().split('T')[0]} has been approved.`,
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
    console.error('Leave approve error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
