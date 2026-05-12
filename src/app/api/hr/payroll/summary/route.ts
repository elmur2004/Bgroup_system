import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'

/**
 * GET /api/hr/payroll/summary?month=&year=
 *
 * Per-company payroll roll-up for one month. The previous implementation
 * did 4–6 round-trips per company in a serial `for` loop (and a `findMany`
 * that hydrated every salary row only to sum client-side), so on a tenant
 * with ~10 active companies it would take multiple seconds. This version:
 *
 *   1. fetches the active companies once,
 *   2. for each company runs all aggregations in parallel via Promise.all,
 *   3. uses `aggregate` (Postgres-side SUM/COUNT) instead of `findMany`,
 *   4. fans the per-company work out across companies in parallel too.
 *
 * End result: O(N) wall-time becomes ~1 round-trip-bundle regardless of N,
 * and zero rows cross the wire when only the totals are needed.
 */
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

    // Only include companies that actually have employees or a payroll period
    // for this window. The DB has accumulated shell companies from older test
    // runs (72 active rows, ~18 with any employees), and running the per-
    // company aggregate block against all of them was the ~6s page hang.
    const companies = await prisma.hrCompany.findMany({
      where: {
        isActive: true,
        nameEn: { not: "" },
        OR: [
          { employees: { some: {} } },
          { payrollPeriods: { some: { month, year } } },
        ],
      },
      select: { id: true, nameEn: true },
    })

    // Per-company aggregation block — every query is a scalar-returning
    // aggregate (no row hydration). Promise.all fans these out across all
    // companies in parallel.
    const result = await Promise.all(
      companies.map(async (company) => {
        // Inside a company, the 4 aggregates are independent so we run them
        // in parallel as well.
        const [salaryAgg, period, empAgg, deductionAgg, bonusAgg] = await Promise.all([
          // Calculated payroll rows for this month
          prisma.hrMonthlySalary.aggregate({
            where: { employee: { companyId: company.id }, month, year },
            _count: { _all: true },
            _sum: {
              baseSalary: true,
              overtimeAmount: true,
              totalBonuses: true,
              totalDeductions: true,
              netSalary: true,
            },
          }),
          prisma.hrPayrollPeriod.findFirst({
            where: { companyId: company.id, month, year },
            select: { id: true, status: true },
          }),
          // Active-headcount + raw-salary fallback (used if no calculated rows)
          prisma.hrEmployee.aggregate({
            where: {
              companyId: company.id,
              status: { in: ['active', 'probation'] },
            },
            _count: { _all: true },
            _sum: { baseSalary: true },
          }),
          prisma.hrIncident.aggregate({
            where: {
              employee: { companyId: company.id },
              incidentDate: { gte: startDate, lte: endDate },
              status: 'applied',
            },
            _sum: { deductionAmount: true },
          }),
          prisma.hrBonus.aggregate({
            where: {
              employee: { companyId: company.id },
              bonusDate: { gte: startDate, lte: endDate },
              status: 'applied',
            },
            _sum: { bonusAmount: true },
          }),
        ])

        const periodStatus = period?.status || null
        const frontendStatus = statusMap[periodStatus || ''] || 'draft'
        const salaryCount = salaryAgg._count?._all ?? 0

        if (salaryCount > 0) {
          // Computed payroll — return the server-side sums verbatim.
          return {
            id: period?.id || null,
            company: company.id,
            company_name: company.nameEn,
            month,
            year,
            total_employees: salaryCount,
            total_base_salary: round2(Number(salaryAgg._sum.baseSalary || 0)),
            total_overtime: round2(Number(salaryAgg._sum.overtimeAmount || 0)),
            total_bonuses: round2(Number(salaryAgg._sum.totalBonuses || 0)),
            total_deductions: round2(Number(salaryAgg._sum.totalDeductions || 0)),
            total_net_salary: round2(Number(salaryAgg._sum.netSalary || 0)),
            status: frontendStatus,
            period_status: periodStatus || 'open',
            period_id: period?.id || null,
            needs_calculation: false,
          }
        }

        // Not yet calculated — fall back to raw bonuses/incidents/base salary.
        const totalBase = Number(empAgg._sum.baseSalary || 0)
        const totalDeductions = Number(deductionAgg._sum.deductionAmount || 0)
        const totalBonuses = Number(bonusAgg._sum.bonusAmount || 0)
        return {
          id: null,
          company: company.id,
          company_name: company.nameEn,
          month,
          year,
          total_employees: empAgg._count?._all ?? 0,
          total_base_salary: round2(totalBase),
          total_overtime: 0,
          total_bonuses: round2(totalBonuses),
          total_deductions: round2(totalDeductions),
          total_net_salary: round2(totalBase + totalBonuses - totalDeductions),
          status: 'draft',
          period_status: 'draft',
          period_id: null,
          needs_calculation: true,
        }
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
