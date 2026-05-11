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
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const activeWhere: Record<string, unknown> = { status: { in: ['active', 'probation'] } }
    if (companyId) activeWhere.companyId = companyId
    const totalActive = await prisma.hrEmployee.count({ where: activeWhere })

    const logWhere: Record<string, unknown> = { date: { gte: today, lt: tomorrow } }
    if (companyId) logWhere.employee = { companyId: companyId }

    const logs = await prisma.hrAttendanceLog.findMany({
      where: logWhere,
      include: { employee: { select: { id: true, fullNameEn: true } } },
    })

    const present = logs.filter((l) => l.status === 'on_time').length
    const late = logs.filter((l) => l.status === 'late').length
    const onLeave = logs.filter((l) => l.status === 'leave').length
    const explicitAbsent = logs.filter((l) => l.status === 'absent').length

    const loggedIds = new Set(logs.map((l) => l.employeeId))
    const notCheckedIn = Math.max(0, totalActive - loggedIds.size)
    const absent = explicitAbsent + notCheckedIn
    const total = present + late + absent + onLeave

    const lateEmployees = logs
      .filter((l) => l.status === 'late')
      .slice(0, 20)
      .map((l) => ({ id: l.employee.id, full_name_en: l.employee.fullNameEn }))

    const absentFromLogs = logs
      .filter((l) => l.status === 'absent')
      .slice(0, 10)
      .map((l) => ({ id: l.employee.id, full_name_en: l.employee.fullNameEn }))

    const noLogEmployees = await prisma.hrEmployee.findMany({
      where: {
        ...activeWhere,
        id: { notIn: Array.from(loggedIds) },
      },
      select: { id: true, fullNameEn: true },
      take: 10,
    })
    const noLogMapped = noLogEmployees.map((e) => ({ id: e.id, full_name_en: e.fullNameEn }))

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      present,
      late,
      absent,
      on_leave: onLeave,
      total,
      late_employees: lateEmployees,
      absent_employees: [...absentFromLogs, ...noLogMapped],
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
