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
    })

    const daysPresent = logs.filter((l) => ['on_time', 'late'].includes(l.status)).length
    const lateCount = logs.filter((l) => l.status === 'late').length
    const absentDays = logs.filter((l) => l.status === 'absent').length
    const totalHours = logs.reduce((sum, l) => sum + Number(l.hoursWorked), 0)

    // Working days
    const shift = employee.shift
    const offDay = shift ? shift.weeklyOffDay : 4
    const daysInMonth = endDate.getDate()
    let workingDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() !== offDay) workingDays++
    }
    const attendanceRate = workingDays > 0 ? (daysPresent / workingDays) * 100 : 0

    return NextResponse.json({
      attendance_rate: Math.round(attendanceRate * 10) / 10,
      total_hours: Math.round(totalHours * 10) / 10,
      days_present: daysPresent,
      late_count: lateCount,
      absent_days: absentDays,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
