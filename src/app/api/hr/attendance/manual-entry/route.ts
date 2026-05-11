import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { manualEntrySchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = manualEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { employee_id, date: logDate, check_in, check_out, reason } = parsed.data

    const employee = await prisma.hrEmployee.findUnique({
      where: { id: employee_id },
      include: { shift: true },
    })
    if (!employee) {
      return NextResponse.json({ detail: 'Employee not found.' }, { status: 404 })
    }

    const dateObj = new Date(logDate)
    dateObj.setHours(0, 0, 0, 0)

    // Compute status and hours
    let status = 'absent'
    let hoursWorked = 0
    let overtimeHours = 0

    if (check_in && employee.shift) {
      const [sh, sm] = employee.shift.startTime.split(':').map(Number)
      const grace = employee.shift.gracePeriodMinutes
      const [ch, cm] = check_in.split(':').map(Number)
      const deadlineMin = sh * 60 + sm + grace
      const checkinMin = ch * 60 + cm
      status = checkinMin > deadlineMin ? 'late' : 'on_time'
    } else if (check_in && !employee.shift) {
      return NextResponse.json(
        { detail: 'Employee has no shift assigned. Assign a shift before entering attendance.' },
        { status: 400 }
      )
    }

    if (check_in && check_out) {
      const [inH, inM] = check_in.split(':').map(Number)
      const [outH, outM] = check_out.split(':').map(Number)
      hoursWorked = Math.max(0, (outH * 60 + outM - inH * 60 - inM) / 60)
      if (employee.shift) {
        const dailyHours = Number(employee.shift.dailyWorkHours)
        if (hoursWorked > dailyHours) {
          overtimeHours = hoursWorked - dailyHours
          hoursWorked = dailyHours
        }
      }
    }

    const now = new Date()
    const log = await prisma.hrAttendanceLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: dateObj } },
      create: {
        employeeId: employee.id,
        date: dateObj,
        checkIn: check_in || null,
        checkOut: check_out || null,
        status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        isManual: true,
        manualReason: reason || '',
        createdById: authUser.id,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        checkIn: check_in || null,
        checkOut: check_out || null,
        status,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        isManual: true,
        manualReason: reason || '',
        createdById: authUser.id,
        updatedAt: now,
      },
    })

    return NextResponse.json({
      id: log.id,
      employee: log.employeeId,
      date: log.date.toISOString().split('T')[0],
      check_in: log.checkIn,
      check_out: log.checkOut,
      status: log.status,
      hours_worked: Number(log.hoursWorked),
      overtime_hours: Number(log.overtimeHours),
      is_manual: log.isManual,
      manual_reason: log.manualReason,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Manual entry error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
