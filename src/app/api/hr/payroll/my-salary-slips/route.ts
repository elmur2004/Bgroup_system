import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)

    const employee = await prisma.hrEmployee.findFirst({
      where: { userId: authUser.id },
    })
    if (!employee) {
      return NextResponse.json({ results: [], count: 0 })
    }

    const slips = await prisma.hrMonthlySalary.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    const results = []

    for (const slip of slips) {
      const startDate = new Date(slip.year, slip.month - 1, 1)
      const endDate = new Date(slip.year, slip.month, 0, 23, 59, 59)

      // OT entries
      const otRequests = await prisma.hrOvertimeRequest.findMany({
        where: {
          employeeId: employee.id,
          status: 'approved',
          date: { gte: startDate, lte: endDate },
        },
        include: { overtimePolicy: true },
      })
      const ot_entries = otRequests.map((ot) => ({
        date: ot.date.toISOString().split('T')[0],
        type: ot.overtimePolicy?.nameEn || '',
        hours: Number(ot.hoursRequested),
        amount: Number(ot.calculatedAmount),
      }))

      // Bonus entries
      const bonuses = await prisma.hrBonus.findMany({
        where: {
          employeeId: employee.id,
          status: 'applied',
          bonusDate: { gte: startDate, lte: endDate },
        },
        include: { bonusRule: true },
      })
      const bonus_entries = bonuses.map((b) => ({
        date: b.bonusDate.toISOString().split('T')[0],
        name: b.bonusRule?.nameEn || '',
        amount: Number(b.bonusAmount),
      }))

      // Deduction entries
      const incidents = await prisma.hrIncident.findMany({
        where: {
          employeeId: employee.id,
          status: 'applied',
          incidentDate: { gte: startDate, lte: endDate },
          deductionAmount: { gt: 0 },
        },
        include: { violationRule: true },
      })
      const deduction_entries = incidents.map((inc) => ({
        date: inc.incidentDate.toISOString().split('T')[0],
        name: inc.violationRule?.nameEn || '',
        amount: Number(inc.deductionAmount),
      }))

      results.push({
        id: slip.id,
        month: slip.month,
        year: slip.year,
        base_salary: Number(slip.baseSalary),
        overtime_amount: Number(slip.overtimeAmount),
        total_bonuses: Number(slip.totalBonuses),
        total_deductions: Number(slip.totalDeductions),
        net_salary: Number(slip.netSalary),
        status: slip.status,
        ot_entries,
        bonus_entries,
        deduction_entries,
      })
    }

    return NextResponse.json({ results, count: results.length })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
