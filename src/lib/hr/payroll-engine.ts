import { db as prisma } from '@/lib/db'
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

interface SalaryCalcResult {
  month: number
  year: number
  baseSalary: Decimal
  overtimeAmount: Decimal
  totalBonuses: Decimal
  totalDeductions: Decimal
  netSalary: Decimal
  workDays: number
  absentDays: number
  lateCount: number
  overtimeHours: Decimal
}

export async function calculateEmployeeSalary(
  employeeId: string,
  month: number,
  year: number
): Promise<SalaryCalcResult> {
  const employee = await prisma.hrEmployee.findUnique({
    where: { id: employeeId },
    include: { shift: true },
  })
  if (!employee) throw new Error(`Employee ${employeeId} not found`)

  const baseSalary = new Decimal(employee.baseSalary.toString())
  let dailyWorkHours = employee.shift
    ? new Decimal(employee.shift.dailyWorkHours.toString())
    : new Decimal('8')
  if (dailyWorkHours.lte(0)) dailyWorkHours = new Decimal('8')

  const hourlyRate = baseSalary.div(30).div(dailyWorkHours)

  // Attendance stats
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const logs = await prisma.hrAttendanceLog.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
    },
  })

  const workDays = logs.filter((l) =>
    ['on_time', 'late', 'leave'].includes(l.status)
  ).length
  const absentDays = logs.filter((l) => l.status === 'absent').length
  const lateCount = logs.filter((l) => l.status === 'late').length

  // Overtime
  const approvedOt = await prisma.hrOvertimeRequest.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
      status: 'approved',
    },
    include: { overtimePolicy: true },
  })

  let overtimeAmount = new Decimal('0')
  let overtimeHours = new Decimal('0')
  for (const ot of approvedOt) {
    overtimeHours = overtimeHours.plus(ot.hoursRequested.toString())
    if (ot.calculatedAmount && new Decimal(ot.calculatedAmount.toString()).gt(0)) {
      overtimeAmount = overtimeAmount.plus(ot.calculatedAmount.toString())
    } else if (ot.overtimePolicy) {
      const multiplier = new Decimal(ot.overtimePolicy.rateMultiplier.toString())
      overtimeAmount = overtimeAmount.plus(
        new Decimal(ot.hoursRequested.toString()).times(multiplier).times(hourlyRate)
      )
    } else {
      // Fallback: 1.5x multiplier if policy was deleted
      overtimeAmount = overtimeAmount.plus(
        new Decimal(ot.hoursRequested.toString()).times('1.5').times(hourlyRate)
      )
    }
  }
  overtimeAmount = overtimeAmount.toDecimalPlaces(2)

  // Bonuses
  const appliedBonuses = await prisma.hrBonus.findMany({
    where: {
      employeeId,
      bonusDate: { gte: startDate, lte: endDate },
      status: 'applied',
    },
  })
  let totalBonuses = new Decimal('0')
  for (const b of appliedBonuses) {
    totalBonuses = totalBonuses.plus(b.bonusAmount.toString())
  }
  totalBonuses = totalBonuses.toDecimalPlaces(2)

  // Deductions (from incidents)
  const appliedIncidents = await prisma.hrIncident.findMany({
    where: {
      employeeId,
      incidentDate: { gte: startDate, lte: endDate },
      status: 'applied',
      deductionAmount: { gt: 0 },
    },
  })
  let totalDeductions = new Decimal('0')
  for (const inc of appliedIncidents) {
    totalDeductions = totalDeductions.plus(inc.deductionAmount.toString())
  }

  // Cap deductions at configurable percentage of base salary (default 50%)
  const maxDeductionSetting = await prisma.hrAppSetting.findFirst({
    where: { key: 'max_deduction_pct' },
  })
  const maxDeductionPct = new Decimal(maxDeductionSetting?.value || '50')
  const maxDeduction = maxDeductionPct.div(100).times(baseSalary)
  if (totalDeductions.gt(maxDeduction)) {
    totalDeductions = maxDeduction
  }
  totalDeductions = totalDeductions.toDecimalPlaces(2)

  // Net salary
  let netSalary = baseSalary.plus(overtimeAmount).plus(totalBonuses).minus(totalDeductions)
  if (netSalary.lt(0)) netSalary = new Decimal('0')
  netSalary = netSalary.toDecimalPlaces(2)

  return {
    month,
    year,
    baseSalary,
    overtimeAmount,
    totalBonuses,
    totalDeductions,
    netSalary,
    workDays,
    absentDays,
    lateCount,
    overtimeHours,
  }
}

export async function calculateCompanyPayroll(
  companyId: string,
  month: number,
  year: number
) {
  const company = await prisma.hrCompany.findUnique({ where: { id: companyId } })
  if (!company) throw new Error('Company not found')

  const employees = await prisma.hrEmployee.findMany({
    where: {
      companyId,
      status: { in: ['active', 'probation'] },
    },
  })

  const results = {
    company: company.nameEn,
    month,
    year,
    total_employees: employees.length,
    total_net_salary: 0,
    total_overtime: 0,
    total_bonuses: 0,
    total_deductions: 0,
    errors: [] as { employee_id: string; error: string }[],
    processed: [] as string[],
  }

  for (const emp of employees) {
    try {
      const calc = await calculateEmployeeSalary(emp.id, month, year)
      const now = new Date()

      await prisma.hrMonthlySalary.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month,
            year,
          },
        },
        create: {
          employeeId: emp.id,
          month,
          year,
          baseSalary: calc.baseSalary.toNumber(),
          overtimeAmount: calc.overtimeAmount.toNumber(),
          totalBonuses: calc.totalBonuses.toNumber(),
          totalDeductions: calc.totalDeductions.toNumber(),
          netSalary: calc.netSalary.toNumber(),
          workDays: calc.workDays,
          absentDays: calc.absentDays,
          lateCount: calc.lateCount,
          overtimeHours: calc.overtimeHours.toNumber(),
          notes: '',
          status: 'open',
          createdAt: now,
          updatedAt: now,
        },
        update: {
          baseSalary: calc.baseSalary.toNumber(),
          overtimeAmount: calc.overtimeAmount.toNumber(),
          totalBonuses: calc.totalBonuses.toNumber(),
          totalDeductions: calc.totalDeductions.toNumber(),
          netSalary: calc.netSalary.toNumber(),
          workDays: calc.workDays,
          absentDays: calc.absentDays,
          lateCount: calc.lateCount,
          overtimeHours: calc.overtimeHours.toNumber(),
          updatedAt: now,
        },
      })

      results.total_net_salary += calc.netSalary.toNumber()
      results.total_overtime += calc.overtimeAmount.toNumber()
      results.total_bonuses += calc.totalBonuses.toNumber()
      results.total_deductions += calc.totalDeductions.toNumber()
      results.processed.push(emp.employeeId)
    } catch (e: unknown) {
      results.errors.push({
        employee_id: emp.employeeId,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // Round totals
  results.total_net_salary = Math.round(results.total_net_salary * 100) / 100
  results.total_overtime = Math.round(results.total_overtime * 100) / 100
  results.total_bonuses = Math.round(results.total_bonuses * 100) / 100
  results.total_deductions = Math.round(results.total_deductions * 100) / 100

  return results
}
