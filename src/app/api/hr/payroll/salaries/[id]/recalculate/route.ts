import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { calculateEmployeeSalary } from '@/lib/hr/payroll-engine'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const salary = await prisma.hrMonthlySalary.findUnique({
      where: { id: id },
    })
    if (!salary) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    if (salary.status === 'finalized') {
      return NextResponse.json({ detail: 'Finalized records cannot be recalculated.' }, { status: 400 })
    }

    const calc = await calculateEmployeeSalary(salary.employeeId, salary.month, salary.year)

    const updated = await prisma.hrMonthlySalary.update({
      where: { id: salary.id },
      data: {
        baseSalary: calc.baseSalary.toNumber(),
        overtimeAmount: calc.overtimeAmount.toNumber(),
        totalBonuses: calc.totalBonuses.toNumber(),
        totalDeductions: calc.totalDeductions.toNumber(),
        netSalary: calc.netSalary.toNumber(),
        workDays: calc.workDays,
        absentDays: calc.absentDays,
        lateCount: calc.lateCount,
        overtimeHours: calc.overtimeHours.toNumber(),
        updatedAt: new Date(),
      },
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: { include: { user: true } },
      },
    })

    return NextResponse.json({
      id: updated.id,
      employee: updated.employeeId,
      employee_name: updated.employee.fullNameEn,
      employee_id_str: updated.employee.employeeId,
      company_name: updated.employee.company?.nameEn || '',
      department_name: updated.employee.department?.nameEn || null,
      currency: updated.employee.currency || 'EGP',
      month: updated.month,
      year: updated.year,
      base_salary: Number(updated.baseSalary),
      overtime_amount: Number(updated.overtimeAmount),
      total_bonuses: Number(updated.totalBonuses),
      total_deductions: Number(updated.totalDeductions),
      net_salary: Number(updated.netSalary),
      work_days: updated.workDays,
      absent_days: updated.absentDays,
      late_count: updated.lateCount,
      overtime_hours: Number(updated.overtimeHours),
      notes: updated.notes || '',
      status: updated.status,
      status_display: updated.status.charAt(0).toUpperCase() + updated.status.slice(1),
      locked_by: updated.lockedById,
      locked_by_email: updated.lockedBy?.user?.email || null,
      locked_at: updated.lockedAt?.toISOString() || null,
      finalized_at: updated.finalizedAt?.toISOString() || null,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Salary recalculate error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
