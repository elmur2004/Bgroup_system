import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { denyOvertimeRequestSchema } from '@/lib/hr/validations'

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
    const body = await request.json()
    const parsed = denyOvertimeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const otRequest = await prisma.hrOvertimeRequest.findUnique({
      where: { id: pk },
      include: { employee: true },
    })
    if (!otRequest) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (otRequest.status !== 'pending') {
      return NextResponse.json({ detail: 'Only pending requests can be denied.' }, { status: 400 })
    }

    const denialReason = data.denial_reason || data.reason || ''

    if (!denialReason || denialReason.trim().length === 0) {
      return NextResponse.json({ detail: 'A reason is required when denying overtime.' }, { status: 400 })
    }

    const updated = await prisma.hrOvertimeRequest.update({
      where: { id: pk },
      data: {
        status: 'denied',
        approvedById: authUser.id,
        approvedAt: now,
        denialReason,
        updatedAt: now,
      },
      include: {
        employee: { include: { company: true, department: true } },
        overtimePolicy: true,
        approvedBy: true,
      },
    })

    // Notify the employee
    if (otRequest.employee?.userId) {
      await prisma.hrNotification.create({
        data: {
          userId: otRequest.employee.userId,
          notificationType: 'ot_denied',
          title: 'Overtime Request Denied',
          message: `Your OT request for ${otRequest.date instanceof Date ? otRequest.date.toISOString().split('T')[0] : otRequest.date} has been denied. Reason: ${denialReason || 'Not specified'}.`,
          isRead: false,
          relatedObjectType: 'OvertimeRequest',
          relatedObjectId: pk,
          createdAt: now,
        },
      })
    }

    return NextResponse.json({
      id: updated.id,
      employee: updated.employeeId,
      employee_name: updated.employee?.fullNameEn || '',
      employee_id_str: updated.employee?.employeeId || '',
      department_name: updated.employee?.department?.nameEn || '',
      date: updated.date instanceof Date ? updated.date.toISOString().split('T')[0] : updated.date,
      overtime_type: updated.overtimeTypeId,
      overtime_type_name: updated.overtimePolicy?.nameEn || '',
      rate_multiplier: updated.overtimePolicy ? parseFloat(String(updated.overtimePolicy.rateMultiplier)) : null,
      hours_requested: parseFloat(String(updated.hoursRequested)),
      reason: updated.reason,
      evidence: updated.evidence || null,
      status: updated.status,
      approved_by: updated.approvedById,
      approved_by_name: updated.approvedBy
        ? `${updated.approvedBy.firstName} ${updated.approvedBy.lastName}`.trim()
        : null,
      approved_at: updated.approvedAt ? updated.approvedAt.toISOString() : null,
      denial_reason: updated.denialReason || '',
      calculated_amount: parseFloat(String(updated.calculatedAmount)),
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime deny error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
