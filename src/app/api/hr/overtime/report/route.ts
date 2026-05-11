import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const url = new URL(request.url)

    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const company = url.searchParams.get('company')
    const department = url.searchParams.get('department')

    const where: any = { status: 'approved' }
    if (dateFrom) where.date = { ...where.date, gte: new Date(dateFrom) }
    if (dateTo) where.date = { ...where.date, lte: new Date(dateTo) }
    if (company) where.employee = { ...where.employee, companyId: company }
    if (department) where.employee = { ...where.employee, departmentId: department }

    const requests = await prisma.hrOvertimeRequest.findMany({
      where,
      include: {
        employee: { include: { department: true } },
      },
    })

    // Per-employee aggregation
    const empMap: Record<string, { name: string; department_name: string; total_hours: number; total_amount: number }> = {}
    for (const ot of requests) {
      const eid = ot.employeeId
      if (!empMap[eid]) {
        empMap[eid] = {
          name: ot.employee?.fullNameEn || '',
          department_name: ot.employee?.department?.nameEn || '',
          total_hours: 0,
          total_amount: 0,
        }
      }
      empMap[eid].total_hours += parseFloat(String(ot.hoursRequested))
      empMap[eid].total_amount += parseFloat(String(ot.calculatedAmount))
    }

    const perEmployee = Object.entries(empMap)
      .map(([eid, v]) => ({
        employee_id: eid,
        employee_name: v.name,
        department_name: v.department_name,
        total_hours: Math.round(v.total_hours * 100) / 100,
        total_amount: Math.round(v.total_amount * 100) / 100,
        rank: 0,
      }))
      .sort((a, b) => b.total_hours - a.total_hours)

    perEmployee.forEach((row, i) => { row.rank = i + 1 })

    const top5 = perEmployee.slice(0, 5)

    // By department
    const deptMap: Record<string, { total_hours: number; total_amount: number }> = {}
    for (const row of perEmployee) {
      const dept = row.department_name || 'No Department'
      if (!deptMap[dept]) deptMap[dept] = { total_hours: 0, total_amount: 0 }
      deptMap[dept].total_hours += row.total_hours
      deptMap[dept].total_amount += row.total_amount
    }
    const byDepartment = Object.entries(deptMap).map(([d, v]) => ({
      department_name: d,
      total_hours: Math.round(v.total_hours * 100) / 100,
      total_amount: Math.round(v.total_amount * 100) / 100,
    }))

    // Monthly trend (last 6 months)
    const today = new Date()
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1)
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59)

      const mWhere: any = { ...where, date: { gte: mStart, lte: mEnd } }
      const mRequests = await prisma.hrOvertimeRequest.findMany({ where: mWhere })

      const totalHours = mRequests.reduce((s, r) => s + parseFloat(String(r.hoursRequested)), 0)
      const totalAmount = mRequests.reduce((s, r) => s + parseFloat(String(r.calculatedAmount)), 0)

      const monthName = mDate.toLocaleString('en', { month: 'short', year: 'numeric' })
      monthlyTrend.push({
        month: monthName,
        total_hours: Math.round(totalHours * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
      })
    }

    // Summary
    const totalOtHours = perEmployee.reduce((s, r) => s + r.total_hours, 0)
    const totalOtCost = perEmployee.reduce((s, r) => s + r.total_amount, 0)
    const empCount = perEmployee.length
    const avgOt = empCount ? Math.round((totalOtHours / empCount) * 100) / 100 : 0
    const highest = perEmployee[0] || null

    return NextResponse.json({
      summary: {
        total_ot_hours: Math.round(totalOtHours * 100) / 100,
        total_ot_cost: Math.round(totalOtCost * 100) / 100,
        avg_ot_per_employee: avgOt,
        highest_ot_employee_name: highest?.employee_name || '',
        highest_ot_employee_hours: highest?.total_hours || 0,
      },
      top5,
      by_department: byDepartment,
      monthly_trend: monthlyTrend,
      per_employee: perEmployee,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime report error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
