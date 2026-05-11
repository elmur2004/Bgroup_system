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

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const salaryWhere: Record<string, unknown> = { month, year }
    if (companyId) {
      salaryWhere.employee = { companyId: companyId }
    }

    const salaries = await prisma.hrMonthlySalary.findMany({
      where: salaryWhere,
      include: {
        employee: { include: { department: true } },
      },
    })

    const deptMap: Record<string, {
      department_name: string
      base_salary: number
      overtime: number
      bonuses: number
      deductions: number
      net_salary: number
    }> = {}

    for (const s of salaries) {
      const deptName = s.employee.department?.nameEn || 'No Department'
      if (!deptMap[deptName]) {
        deptMap[deptName] = {
          department_name: deptName,
          base_salary: 0,
          overtime: 0,
          bonuses: 0,
          deductions: 0,
          net_salary: 0,
        }
      }
      deptMap[deptName].base_salary += Number(s.baseSalary)
      deptMap[deptName].overtime += Number(s.overtimeAmount)
      deptMap[deptName].bonuses += Number(s.totalBonuses)
      deptMap[deptName].deductions += Number(s.totalDeductions)
      deptMap[deptName].net_salary += Number(s.netSalary)
    }

    // Fallback: if no payroll records, show base salaries from employees
    if (Object.keys(deptMap).length === 0) {
      const empWhere: Record<string, unknown> = {
        status: { in: ['active', 'probation'] },
      }
      if (companyId) empWhere.companyId = companyId

      const employees = await prisma.hrEmployee.findMany({
        where: empWhere,
        include: { department: true },
      })

      for (const emp of employees) {
        const deptName = emp.department?.nameEn || 'No Department'
        if (!deptMap[deptName]) {
          deptMap[deptName] = {
            department_name: deptName,
            base_salary: 0,
            overtime: 0,
            bonuses: 0,
            deductions: 0,
            net_salary: 0,
          }
        }
        deptMap[deptName].base_salary += Number(emp.baseSalary)
      }

      // Add bonuses
      const bonuses = await prisma.hrBonus.findMany({
        where: {
          bonusDate: { gte: startDate, lte: endDate },
          status: 'applied',
          ...(companyId ? { employee: { companyId: companyId } } : {}),
        },
        include: { employee: { include: { department: true } } },
      })
      for (const b of bonuses) {
        const deptName = b.employee.department?.nameEn || 'No Department'
        if (deptMap[deptName]) {
          deptMap[deptName].bonuses += Number(b.bonusAmount)
        }
      }

      // Add deductions
      const incidents = await prisma.hrIncident.findMany({
        where: {
          incidentDate: { gte: startDate, lte: endDate },
          status: 'applied',
          deductionAmount: { gt: 0 },
          ...(companyId ? { employee: { companyId: companyId } } : {}),
        },
        include: { employee: { include: { department: true } } },
      })
      for (const inc of incidents) {
        const deptName = inc.employee.department?.nameEn || 'No Department'
        if (deptMap[deptName]) {
          deptMap[deptName].deductions += Number(inc.deductionAmount)
        }
      }

      // Compute net
      for (const d of Object.values(deptMap)) {
        d.net_salary = d.base_salary + d.bonuses - d.deductions
      }
    }

    return NextResponse.json(Object.values(deptMap))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
