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

    const otRequest = await prisma.hrOvertimeRequest.findUnique({
      where: { id: pk },
      include: {
        employee: { include: { company: true, department: true } },
        overtimePolicy: true,
      },
    })
    if (!otRequest) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (otRequest.status !== 'pending') {
      return NextResponse.json({ detail: 'Only pending requests can be approved.' }, { status: 400 })
    }

    // Calculate OT amount: hours * multiplier * (baseSalary / 30 / dailyWorkHours)
    let calculatedAmount = 0
    const employee = otRequest.employee
    const policy = otRequest.overtimePolicy
    if (employee && policy) {
      const baseSalary = parseFloat(String(employee.baseSalary))
      // Get shift daily work hours, default to 8
      let dailyWorkHours = 8
      if (employee.shiftId) {
        const shift = await prisma.hrShift.findUnique({ where: { id: employee.shiftId } })
        if (shift) dailyWorkHours = parseFloat(String(shift.dailyWorkHours))
      }
      const hourlyRate = baseSalary / 30 / dailyWorkHours
      calculatedAmount = parseFloat(String(otRequest.hoursRequested)) * parseFloat(String(policy.rateMultiplier)) * hourlyRate
    }

    const updated = await prisma.hrOvertimeRequest.update({
      where: { id: pk },
      data: {
        status: 'approved',
        approvedById: authUser.id,
        approvedAt: now,
        calculatedAmount: Math.round(calculatedAmount * 100) / 100,
        updatedAt: now,
      },
      include: {
        employee: { include: { company: true, department: true } },
        overtimePolicy: true,
        approvedBy: true,
      },
    })

    // Notify the employee
    if (employee?.userId) {
      await prisma.hrNotification.create({
        data: {
          userId: employee.userId,
          notificationType: 'ot_approved',
          title: 'Overtime Request Approved',
          message: `Your OT request for ${otRequest.date instanceof Date ? otRequest.date.toISOString().split('T')[0] : otRequest.date} (${otRequest.hoursRequested}h) has been approved. Amount: ${calculatedAmount.toFixed(2)} ${employee.currency}.`,
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
    console.error('Overtime approve error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
