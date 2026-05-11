import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const month = today.getMonth() + 1
    const year = today.getFullYear()

    const companies = await prisma.hrCompany.findMany({ where: { isActive: true } })
    const result = []

    for (const company of companies) {
      const empCount = await prisma.hrEmployee.count({
        where: { companyId: company.id, status: { in: ['active', 'probation'] } },
      })

      const coSalaryAgg = await prisma.hrMonthlySalary.aggregate({
        where: { employee: { companyId: company.id }, month, year },
        _sum: { netSalary: true },
      })
      let coPayroll = Number(coSalaryAgg._sum.netSalary || 0)
      if (coPayroll === 0) {
        const coBase = await prisma.hrEmployee.aggregate({
          where: { companyId: company.id, status: { in: ['active', 'probation'] } },
          _sum: { baseSalary: true },
        })
        coPayroll = Number(coBase._sum.baseSalary || 0)
      }

      const coTotal = await prisma.hrAttendanceLog.count({
        where: { date: { gte: today, lt: tomorrow }, employee: { companyId: company.id } },
      })
      const coPresent = await prisma.hrAttendanceLog.count({
        where: {
          date: { gte: today, lt: tomorrow },
          employee: { companyId: company.id },
          status: { in: ['on_time', 'late'] },
        },
      })
      const coAttRate = coTotal > 0 ? Math.round((coPresent / coTotal) * 100) : 0

      const pendingIssues =
        (await prisma.hrOvertimeRequest.count({
          where: { employee: { companyId: company.id }, status: 'pending' },
        })) +
        (await prisma.hrIncident.count({
          where: { employee: { companyId: company.id }, status: 'pending' },
        }))

      result.push({
        id: company.id,
        name_en: company.nameEn,
        employee_count: empCount,
        monthly_payroll: coPayroll,
        attendance_rate: coAttRate,
        pending_issues: pendingIssues,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
