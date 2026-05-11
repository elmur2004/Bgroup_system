import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const alerts: Array<Record<string, unknown>> = []

    // Contracts expiring in 30 days
    const in30 = new Date(today)
    in30.setDate(in30.getDate() + 30)
    const contractWhere: Record<string, unknown> = {
      contractEnd: { gte: today, lte: in30 },
      status: { in: ['active', 'probation'] },
    }
    if (companyId) contractWhere.companyId = companyId
    const expiringContracts = await prisma.hrEmployee.findMany({ where: contractWhere })
    for (const emp of expiringContracts) {
      const daysLeft = Math.ceil(
        (new Date(emp.contractEnd!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        type: 'contract_expiry',
        severity: daysLeft <= 7 ? 'danger' : 'warning',
        employee_id: emp.id,
        employee_name: emp.fullNameEn,
        message: `Contract expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        due_date: emp.contractEnd!.toISOString().split('T')[0],
      })
    }

    // Probation ending in 14 days
    const in14 = new Date(today)
    in14.setDate(in14.getDate() + 14)
    const probWhere: Record<string, unknown> = {
      probationEnd: { gte: today, lte: in14 },
      status: 'probation',
    }
    if (companyId) probWhere.companyId = companyId
    const probEnding = await prisma.hrEmployee.findMany({ where: probWhere })
    for (const emp of probEnding) {
      const daysLeft = Math.ceil(
        (new Date(emp.probationEnd!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        type: 'probation_end',
        severity: 'info',
        employee_id: emp.id,
        employee_name: emp.fullNameEn,
        message: `Probation ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        due_date: emp.probationEnd!.toISOString().split('T')[0],
      })
    }

    // 3+ lates this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lateWhere: Record<string, unknown> = {
      date: { gte: monthStart },
      status: 'late',
    }
    if (companyId) lateWhere.employee = { companyId: companyId }
    const lateLogs = await prisma.hrAttendanceLog.groupBy({
      by: ['employeeId'],
      where: lateWhere,
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    })

    if (lateLogs.length > 0) {
      const empIds = lateLogs.map((l) => l.employeeId)
      const employees = await prisma.hrEmployee.findMany({
        where: { id: { in: empIds } },
      })
      const empMap = new Map(employees.map((e) => [e.id, e]))
      const countMap = new Map(lateLogs.map((l) => [l.employeeId, l._count.id]))

      for (const [empId, emp] of Array.from(empMap)) {
        alerts.push({
          type: '3_lates',
          severity: 'warning',
          employee_id: emp.id,
          employee_name: emp.fullNameEn,
          message: `${countMap.get(empId)} late check-ins this month.`,
        })
      }
    }

    return NextResponse.json(alerts)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
