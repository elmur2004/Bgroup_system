import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const url = new URL(request.url)

    const now = new Date()
    const month = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1), 10)
    const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()), 10)
    const company = url.searchParams.get('company')

    const baseWhere: any = {}
    if (company) baseWhere.employee = { companyId: company }

    // Build date range for the target month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59)

    const totalPending = await prisma.hrOvertimeRequest.count({
      where: { ...baseWhere, status: 'pending' },
    })

    const approvedRequests = await prisma.hrOvertimeRequest.findMany({
      where: {
        ...baseWhere,
        status: 'approved',
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const approvedThisMonthHours = approvedRequests.reduce(
      (sum, r) => sum + parseFloat(String(r.hoursRequested)), 0
    )
    const approvedThisMonthAmount = approvedRequests.reduce(
      (sum, r) => sum + parseFloat(String(r.calculatedAmount)), 0
    )

    const deniedCount = await prisma.hrOvertimeRequest.count({
      where: {
        ...baseWhere,
        status: 'denied',
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const pendingRequests = await prisma.hrOvertimeRequest.findMany({
      where: { ...baseWhere, status: 'pending' },
    })
    const budgetImpact = pendingRequests.reduce(
      (sum, r) => sum + parseFloat(String(r.calculatedAmount)), 0
    )

    return NextResponse.json({
      total_pending: totalPending,
      approved_this_month_hours: Math.round(approvedThisMonthHours * 100) / 100,
      approved_this_month_amount: Math.round(approvedThisMonthAmount * 100) / 100,
      denied_count: deniedCount,
      budget_impact: Math.round(budgetImpact * 100) / 100,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime summary error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
