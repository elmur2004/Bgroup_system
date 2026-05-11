import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)

    const today = new Date()
    const result = []

    for (let i = 5; i >= 0; i--) {
      const target = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const m = target.getMonth() + 1
      const y = target.getFullYear()
      const label = target.toLocaleString('en-US', { month: 'short', year: 'numeric' })

      // Total salary
      const salaryAgg = await prisma.hrMonthlySalary.aggregate({
        where: { month: m, year: y },
        _sum: { netSalary: true },
      })
      let totalSalary = Number(salaryAgg._sum.netSalary || 0)

      if (totalSalary === 0) {
        const baseAgg = await prisma.hrEmployee.aggregate({
          where: { status: { in: ['active', 'probation'] } },
          _sum: { baseSalary: true },
        })
        totalSalary = Number(baseAgg._sum.baseSalary || 0)
      }

      // Headcount
      const headcount = await prisma.hrEmployee.count({
        where: { status: { in: ['active', 'probation'] } },
      })

      // Attendance rate
      const lastDay = new Date(y, m, 0).getDate()
      const monthStart = new Date(y, m - 1, 1)
      const monthEnd = new Date(y, m - 1, lastDay, 23, 59, 59)

      const totalLogs = await prisma.hrAttendanceLog.count({
        where: { date: { gte: monthStart, lte: monthEnd } },
      })
      const presentLogs = await prisma.hrAttendanceLog.count({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ['on_time', 'late'] },
        },
      })
      const attendanceRate = totalLogs > 0 ? Math.round((presentLogs / totalLogs) * 100) : 0

      result.push({
        month: label,
        total_salary: totalSalary,
        headcount,
        attendance_rate: attendanceRate,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
