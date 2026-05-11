import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const company = url.searchParams.get('company')
    const department = url.searchParams.get('department')

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ detail: 'date_from and date_to are required.' }, { status: 400 })
    }

    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)

    // Get employees matching filters
    const empWhere: any = { status: { in: ['active', 'probation'] } }
    if (company) empWhere.companyId = company
    if (department) empWhere.departmentId = department

    const employees = await prisma.hrEmployee.findMany({
      where: empWhere,
      include: { department: true },
    })

    // Get all logs in the date range for these employees
    const employeeIds = employees.map((e) => e.id)
    const logs = await prisma.hrAttendanceLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: fromDate, lte: toDate },
      },
    })

    // Calculate work days in range (excluding Fridays as default weekend)
    const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    let workDaysInRange = 0
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 5) workDaysInRange++ // 5 = Friday
    }

    // Build per-employee rows
    let totalAbsences = 0
    let totalLate = 0
    let totalOtHours = 0
    let totalAttendancePct = 0

    const rows = employees.map((emp) => {
      const empLogs = logs.filter((l) => l.employeeId === emp.id)
      const present = empLogs.filter((l) => ['on_time', 'late'].includes(l.status)).length
      const absent = empLogs.filter((l) => l.status === 'absent').length
      const late = empLogs.filter((l) => l.status === 'late').length
      const onLeave = empLogs.filter((l) => l.status === 'leave').length
      const totalHours = empLogs.reduce((sum, l) => sum + Number(l.hoursWorked), 0)
      const otHours = empLogs.reduce((sum, l) => sum + Number(l.overtimeHours), 0)
      const attendancePct = workDaysInRange > 0 ? Math.round((present / workDaysInRange) * 100 * 10) / 10 : 0

      totalAbsences += absent
      totalLate += late
      totalOtHours += otHours
      totalAttendancePct += attendancePct

      return {
        employee_id: emp.employeeId,
        employee_name: emp.fullNameEn,
        department_name: emp.department?.nameEn || '',
        work_days: workDaysInRange,
        present,
        absent,
        late,
        on_leave: onLeave,
        total_hours: Math.round(totalHours * 100) / 100,
        avg_hours_per_day: present > 0 ? Math.round((totalHours / present) * 100) / 100 : 0,
        ot_hours: Math.round(otHours * 100) / 100,
        attendance_pct: attendancePct,
      }
    })

    const avgAttendanceRate = employees.length > 0 ? Math.round((totalAttendancePct / employees.length) * 10) / 10 : 0

    return NextResponse.json({
      summary: {
        avg_attendance_rate: avgAttendanceRate,
        total_absences: totalAbsences,
        total_late: totalLate,
        total_ot_hours: Math.round(totalOtHours * 100) / 100,
      },
      rows,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Attendance report error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
