import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company') || searchParams.get('company_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json({ detail: 'month and year are required.' }, { status: 400 })
    }

    const m = month
    const y = year

    const salaryWhere: Record<string, unknown> = { month: m, year: y }
    if (companyId) {
      salaryWhere.employee = { companyId: companyId }
    }

    const salaries = await prisma.hrMonthlySalary.findMany({
      where: salaryWhere,
      include: {
        employee: { include: { department: true, company: true } },
      },
      orderBy: { employee: { employeeId: 'asc' } },
    })

    let company = null
    if (companyId) {
      company = await prisma.hrCompany.findUnique({ where: { id: companyId } })
    }

    const totalNet = salaries.reduce((sum, s) => sum + Number(s.netSalary), 0)
    const totalBase = salaries.reduce((sum, s) => sum + Number(s.baseSalary), 0)
    const totalBonuses = salaries.reduce((sum, s) => sum + Number(s.totalBonuses), 0)
    const totalDeductions = salaries.reduce((sum, s) => sum + Number(s.totalDeductions), 0)
    const totalOt = salaries.reduce((sum, s) => sum + Number(s.overtimeAmount), 0)

    return NextResponse.json({
      company_name: company?.nameEn || 'All Companies',
      month: m,
      year: y,
      total_employees: salaries.length,
      total_base_salary: Math.round(totalBase * 100) / 100,
      total_overtime: Math.round(totalOt * 100) / 100,
      total_bonuses: Math.round(totalBonuses * 100) / 100,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      total_net_salary: Math.round(totalNet * 100) / 100,
      records: salaries.map((s) => ({
        employee_id: s.employee.employeeId,
        employee_name: s.employee.fullNameEn,
        department: s.employee.department?.nameEn || '',
        position: s.employee.positionEn,
        base_salary: Number(s.baseSalary),
        ot_hours: Number(s.overtimeHours),
        ot_amount: Number(s.overtimeAmount),
        bonuses: Number(s.totalBonuses),
        deductions: Number(s.totalDeductions),
        net_salary: Number(s.netSalary),
        currency: s.employee.currency,
        work_days: s.workDays,
        absent_days: s.absentDays,
        late_count: s.lateCount,
      })),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
