import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { createAuditLog, getClientIp } from '@/lib/hr/audit'
import { updateMonthlySalarySchema } from '@/lib/hr/validations'

function serializeSalary(s: any) {
  return {
    id: s.id,
    employee: s.employeeId,
    employee_name: s.employee?.fullNameEn || '',
    employee_id_str: s.employee?.employeeId || '',
    company_name: s.employee?.company?.nameEn || '',
    department_name: s.employee?.department?.nameEn || null,
    currency: s.employee?.currency || 'EGP',
    month: s.month,
    year: s.year,
    base_salary: Number(s.baseSalary),
    overtime_amount: Number(s.overtimeAmount),
    total_bonuses: Number(s.totalBonuses),
    total_deductions: Number(s.totalDeductions),
    net_salary: Number(s.netSalary),
    work_days: s.workDays,
    absent_days: s.absentDays,
    late_count: s.lateCount,
    overtime_hours: Number(s.overtimeHours),
    notes: s.notes || '',
    status: s.status,
    status_display: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    locked_by: s.lockedById,
    locked_by_email: s.lockedBy?.email || null,
    locked_at: s.lockedAt?.toISOString() || null,
    finalized_at: s.finalizedAt?.toISOString() || null,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params
    const salary = await prisma.hrMonthlySalary.findUnique({
      where: { id: id },
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: true,
      },
    })
    if (!salary) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (!canManagePayroll(authUser)) {
      const ownEmp = await prisma.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      })
      if (!ownEmp || salary.employeeId !== ownEmp.id) {
        return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
      }
    }

    await createAuditLog({
      userId: authUser.id,
      action: 'read',
      entityType: 'monthly_salary',
      entityId: salary.id,
      ipAddress: getClientIp(request),
      details: `Viewed salary slip ${salary.month}/${salary.year} for employee ${salary.employeeId}`,
    })

    return NextResponse.json(serializeSalary(salary))
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
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const parsed = updateMonthlySalarySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.notes !== undefined) updateData.notes = data.notes

    const salary = await prisma.hrMonthlySalary.update({
      where: { id: id },
      data: updateData,
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: true,
      },
    })
    return NextResponse.json(serializeSalary(salary))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
