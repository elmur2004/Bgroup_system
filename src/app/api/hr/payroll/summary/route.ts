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
    const now = new Date()
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10)
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const statusMap: Record<string, string> = {
      open: 'calculated',
      locked: 'locked',
      finalized: 'paid',
      paid: 'paid',
    }

    const companies = await prisma.hrCompany.findMany({
      where: { isActive: true },
    })

    const result = []

    for (const company of companies) {
      const activeEmployees = await prisma.hrEmployee.count({
        where: {
          companyId: company.id,
          status: { in: ['active', 'probation'] },
        },
      })

      const salaries = await prisma.hrMonthlySalary.findMany({
        where: {
          employee: { companyId: company.id },
          month,
          year,
        },
      })

      const period = await prisma.hrPayrollPeriod.findFirst({
        where: { companyId: company.id, month, year },
      })
      const periodStatus = period?.status || null
      const frontendStatus = statusMap[periodStatus || ''] || 'draft'

      if (salaries.length > 0) {
        let totalBase = 0, totalOt = 0, totalBonuses = 0, totalDeductions = 0, totalNet = 0
        for (const s of salaries) {
          totalBase += Number(s.baseSalary)
          totalOt += Number(s.overtimeAmount)
          totalBonuses += Number(s.totalBonuses)
          totalDeductions += Number(s.totalDeductions)
          totalNet += Number(s.netSalary)
        }

        result.push({
          id: period?.id || null,
          company: company.id,
          company_name: company.nameEn,
          month,
          year,
          total_employees: salaries.length,
          total_base_salary: Math.round(totalBase * 100) / 100,
          total_overtime: Math.round(totalOt * 100) / 100,
          total_bonuses: Math.round(totalBonuses * 100) / 100,
          total_deductions: Math.round(totalDeductions * 100) / 100,
          total_net_salary: Math.round(totalNet * 100) / 100,
          status: frontendStatus,
          period_status: periodStatus || 'open',
          period_id: period?.id || null,
          needs_calculation: false,
        })
      } else {
        // No payroll calculated yet — aggregate from raw data
        const empAgg = await prisma.hrEmployee.aggregate({
          where: {
            companyId: company.id,
            status: { in: ['active', 'probation'] },
          },
          _sum: { baseSalary: true },
        })
        const totalBase = Number(empAgg._sum.baseSalary || 0)

        const deductionAgg = await prisma.hrIncident.aggregate({
          where: {
            employee: { companyId: company.id },
            incidentDate: { gte: startDate, lte: endDate },
            status: 'applied',
          },
          _sum: { deductionAmount: true },
        })
        const totalDeductions = Number(deductionAgg._sum.deductionAmount || 0)

        const bonusAgg = await prisma.hrBonus.aggregate({
          where: {
            employee: { companyId: company.id },
            bonusDate: { gte: startDate, lte: endDate },
            status: 'applied',
          },
          _sum: { bonusAmount: true },
        })
        const totalBonuses = Number(bonusAgg._sum.bonusAmount || 0)

        result.push({
          id: null,
          company: company.id,
          company_name: company.nameEn,
          month,
          year,
          total_employees: activeEmployees,
          total_base_salary: totalBase,
          total_overtime: 0,
          total_bonuses: totalBonuses,
          total_deductions: totalDeductions,
          total_net_salary: totalBase + totalBonuses - totalDeductions,
          status: 'draft',
          period_status: 'draft',
          period_id: null,
          needs_calculation: true,
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
