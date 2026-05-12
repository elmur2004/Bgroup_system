import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canViewAllEmployees } from '@/lib/hr/permissions'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)
    const companyId = url.searchParams.get('company')
    // Optional ?date=YYYY-MM-DD — defaults to today. Anything malformed
    // falls back to today so the page doesn't 500 on garbage input.
    const dateParam = url.searchParams.get('date')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number)
      today.setFullYear(y, m - 1, d)
      today.setHours(0, 0, 0, 0)
    }

    const isHR = canViewAllEmployees(authUser)

    let employeeWhere: any = { status: 'active' }
    if (isHR) {
      if (companyId) employeeWhere.companyId = companyId
    } else {
      const employee = await prisma.hrEmployee.findUnique({ where: { userId: authUser.id } })
      if (!employee) {
        return NextResponse.json({ detail: 'No employee profile found.' }, { status: 400 })
      }
      employeeWhere = { id: employee.id }
    }

    const employees = await prisma.hrEmployee.findMany({
      where: employeeWhere,
      include: { department: true, shift: true },
    })

    const todayLogs = await prisma.hrAttendanceLog.findMany({
      where: { date: today, employeeId: { in: employees.map((e) => e.id) } },
    })
    const logMap = new Map(todayLogs.map((l) => [l.employeeId, l]))

    const stats = { total: 0, checked_in: 0, on_time: 0, late: 0, not_yet: 0, absent: 0, on_leave: 0 }
    const logs: any[] = []

    for (const emp of employees) {
      const log = logMap.get(emp.id)
      stats.total++

      let statusVal = 'not_yet'
      if (log) {
        statusVal = log.status
        if (log.checkIn) stats.checked_in++
        if (statusVal === 'on_time') stats.on_time++
        else if (statusVal === 'late') stats.late++
        else if (statusVal === 'absent') stats.absent++
        else if (statusVal === 'leave') stats.on_leave++
      } else {
        stats.not_yet++
      }

      // Late minutes
      let lateMinutes = 0
      if (log?.checkIn && emp.shift) {
        const [sh, sm] = emp.shift.startTime.split(':').map(Number)
        const grace = emp.shift.gracePeriodMinutes
        const deadlineMin = sh * 60 + sm + grace
        const [ch, cm] = log.checkIn.split(':').map(Number)
        const checkinMin = ch * 60 + cm
        if (checkinMin > deadlineMin) lateMinutes = checkinMin - deadlineMin
      }

      logs.push({
        id: log?.id || null,
        employee_id: emp.id,
        employee: emp.id,
        employee_id_str: emp.employeeId,
        employee_name: emp.fullNameEn,
        photo: emp.photo || null,
        position: emp.positionEn,
        department: emp.department?.nameEn || '',
        department_name: emp.department?.nameEn || '',
        shift_name: emp.shift?.name || '',
        expected_in: emp.shift?.startTime?.substring(0, 5) || null,
        expected_out: emp.shift?.endTime?.substring(0, 5) || null,
        check_in: log?.checkIn?.substring(0, 5) || null,
        check_out: log?.checkOut?.substring(0, 5) || null,
        status: statusVal,
        hours_worked: log ? Number(log.hoursWorked) : 0,
        overtime_hours: log ? Number(log.overtimeHours) : 0,
        late_minutes: lateMinutes,
        auto_actions: [],
      })
    }

    return NextResponse.json({ stats, logs })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Today attendance error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
