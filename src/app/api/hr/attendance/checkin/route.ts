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

    // Check existing log
    const existing = await prisma.hrAttendanceLog.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    })

    if (existing && existing.checkIn) {
      return NextResponse.json({ detail: 'You have already checked in today.' }, { status: 400 })
    }

    // Compute status
    let status = 'on_time'
    if (employee.shift) {
      const shiftStart = employee.shift.startTime
      const grace = employee.shift.gracePeriodMinutes
      const [sh, sm] = shiftStart.split(':').map(Number)
      const deadlineMinutes = sh * 60 + sm + grace
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      if (currentMinutes > deadlineMinutes) {
        status = 'late'
      }
    }

    let log
    if (existing) {
      log = await prisma.hrAttendanceLog.update({
        where: { id: existing.id },
        data: { checkIn: nowTimeStr, status, updatedAt: now },
      })
    } else {
      log = await prisma.hrAttendanceLog.create({
        data: {
          employeeId: employee.id,
          date: today,
          checkIn: nowTimeStr,
          status,
          hoursWorked: 0,
          overtimeHours: 0,
          isManual: false,
          manualReason: '',
          createdAt: now,
          updatedAt: now,
        },
      })
    }

    // If late, notify the employee and all HR managers
    if (status === 'late') {
      const lateNow = new Date()

      // Notify the employee themselves
      if (employee.userId) {
        await prisma.hrNotification.create({
          data: {
            userId: employee.userId,
            notificationType: 'late_checkin',
            title: 'Late Check-In',
            message: `You checked in late at ${nowTimeStr}. Your shift starts at ${employee.shift?.startTime || 'N/A'}.`,
            isRead: false,
            relatedObjectType: 'AttendanceLog',
            relatedObjectId: log.id,
            createdAt: lateNow,
          },
        })
      }

      // Notify all HR managers
      const hrManagers = await prisma.hrUserRole.findMany({
        where: { role: { name: 'hr_manager' } },
        select: { userId: true },
      })
      const hrUserIds = Array.from(new Set(hrManagers.map((u) => u.userId)))
      for (const uid of hrUserIds) {
        await prisma.hrNotification.create({
          data: {
            userId: uid,
            notificationType: 'late_checkin',
            title: 'Employee Late Check-In',
            message: `${employee.fullNameEn} (${employee.employeeId}) checked in late at ${nowTimeStr}.`,
            isRead: false,
            relatedObjectType: 'AttendanceLog',
            relatedObjectId: log.id,
            createdAt: lateNow,
          },
        })
      }
    }

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
    console.error('Check-in error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
