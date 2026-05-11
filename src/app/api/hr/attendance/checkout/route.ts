import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)

    const employee = await prisma.hrEmployee.findUnique({
      where: { userId: authUser.id },
      include: { shift: true },
    })
    if (!employee) {
      return NextResponse.json({ detail: 'No employee profile found for this user.' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    const log = await prisma.hrAttendanceLog.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    })

    if (!log) {
      return NextResponse.json({ detail: 'No check-in record found for today. Please check in first.' }, { status: 400 })
    }
    if (log.checkOut) {
      return NextResponse.json({ detail: 'You have already checked out today.' }, { status: 400 })
    }

    // Calculate hours worked
    let hoursWorked = 0
    let overtimeHours = 0
    if (log.checkIn) {
      const [inH, inM] = log.checkIn.split(':').map(Number)
      const inMinutes = inH * 60 + inM
      const outMinutes = now.getHours() * 60 + now.getMinutes()
      hoursWorked = Math.max(0, (outMinutes - inMinutes) / 60)

      if (employee.shift) {
        const dailyHours = Number(employee.shift.dailyWorkHours)
        if (hoursWorked > dailyHours) {
          overtimeHours = hoursWorked - dailyHours
          hoursWorked = dailyHours
        }
      }
    }

    const updated = await prisma.hrAttendanceLog.update({
      where: { id: log.id },
      data: {
        checkOut: nowTimeStr,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        updatedAt: now,
      },
    })

    return NextResponse.json({
      id: updated.id,
      employee: updated.employeeId,
      date: updated.date.toISOString().split('T')[0],
      check_in: updated.checkIn,
      check_out: updated.checkOut,
      status: updated.status,
      hours_worked: Number(updated.hoursWorked),
      overtime_hours: Number(updated.overtimeHours),
      is_manual: updated.isManual,
      manual_reason: updated.manualReason,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Check-out error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
