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

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const log = await prisma.hrAttendanceLog.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    })

    const shift = employee.shift
    const shiftStart = shift?.startTime?.substring(0, 5) || '08:00'
    const shiftEnd = shift?.endTime?.substring(0, 5) || '17:00'
    const shiftName = shift?.name || ''

    const hasCheckedIn = !!(log?.checkIn)
    const hasCheckedOut = !!(log?.checkOut)

    let lateMinutes = 0
    let isLate = false
    if (hasCheckedIn && shift) {
      const [sh, sm] = shift.startTime.split(':').map(Number)
      const grace = shift.gracePeriodMinutes
      const deadlineMin = sh * 60 + sm + grace
      const [ch, cm] = log!.checkIn!.split(':').map(Number)
      const checkinMin = ch * 60 + cm
      if (checkinMin > deadlineMin) {
        isLate = true
        lateMinutes = checkinMin - deadlineMin
      }
    }

    return NextResponse.json({
      has_checked_in: hasCheckedIn,
      has_checked_out: hasCheckedOut,
      check_in_time: log?.checkIn?.substring(0, 5) || null,
      check_out_time: log?.checkOut?.substring(0, 5) || null,
      is_late: isLate,
      late_minutes: lateMinutes,
      hours_worked: log ? Number(log.hoursWorked) : 0,
      overtime_hours: log ? Number(log.overtimeHours) : 0,
      shift_name: shiftName,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      status: log?.status || 'absent',
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
