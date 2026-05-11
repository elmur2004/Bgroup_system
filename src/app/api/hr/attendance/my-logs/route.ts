import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const employee = await prisma.hrEmployee.findUnique({
      where: { userId: authUser.id },
      include: { shift: true },
    })
    if (!employee) {
      return NextResponse.json({ detail: 'No employee profile found.' }, { status: 400 })
    }

    const url = new URL(request.url)
    const now = new Date()
    const month = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1), 10)
    const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()), 10)

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const logs = await prisma.hrAttendanceLog.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    })

    const shift = employee.shift
    const results = logs.map((log) => {
      let lateMinutes = 0
      if (log.checkIn && shift) {
        const [sh, sm] = shift.startTime.split(':').map(Number)
        const grace = shift.gracePeriodMinutes
        const deadlineMin = sh * 60 + sm + grace
        const [ch, cm] = log.checkIn.split(':').map(Number)
        const checkinMin = ch * 60 + cm
        if (checkinMin > deadlineMin) lateMinutes = checkinMin - deadlineMin
      }

      return {
        id: log.id,
        date: log.date.toISOString().split('T')[0],
        check_in: log.checkIn || null,
        check_out: log.checkOut || null,
        status: log.status,
        hours_worked: Number(log.hoursWorked),
        overtime_hours: Number(log.overtimeHours),
        late_minutes: lateMinutes,
        notes: log.manualReason || '',
      }
    })

    return NextResponse.json({ results, count: results.length })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
