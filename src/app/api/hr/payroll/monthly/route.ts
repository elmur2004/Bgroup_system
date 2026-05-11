import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company')
    const now = new Date()
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10)
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)

    const where: Record<string, unknown> = { month, year }
    if (companyId) {
      where.employee = { companyId: companyId }
    }

    const salaries = await prisma.hrMonthlySalary.findMany({
      where,
      include: {
        employee: {
          include: { company: true, department: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    let period = null
    if (companyId) {
      period = await prisma.hrPayrollPeriod.findFirst({
        where: {
          companyId: companyId,
          month,
          year,
        },
      })
    }

    const records = salaries.map((s) => ({
      id: s.id,
      employee_id: s.employee.employeeId,
      employee_name: s.employee.fullNameEn,
      department_name: s.employee.department?.nameEn || '',
      base_salary: Number(s.baseSalary),
      work_days: s.workDays,
      absent_days: s.absentDays,
      late_count: s.lateCount,
      ot_hours: Number(s.overtimeHours),
      ot_amount: Number(s.overtimeAmount),
      total_deductions: Number(s.totalDeductions),
      total_bonuses: Number(s.totalBonuses),
      net_salary: Number(s.netSalary),
      notes: s.notes || '',
      status: s.status,
      deductions: [],
      bonuses: [],
    }))

    return NextResponse.json({
      records,
      status: period ? period.status.toUpperCase() : 'OPEN',
      period_id: period?.id || null,
      month,
      year,
      company: companyId ? companyId : null,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
