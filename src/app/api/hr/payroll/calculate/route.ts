import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { calculateCompanyPayroll } from '@/lib/hr/payroll-engine'
import { payrollCalculateSchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = payrollCalculateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { company_id, month, year } = parsed.data

    const companyIdInt = company_id
    const monthInt = typeof month === 'number' ? month : parseInt(String(month), 10)
    const yearInt = typeof year === 'number' ? year : parseInt(String(year), 10)

    if (isNaN(monthInt) || isNaN(yearInt)) {
      return NextResponse.json(
        { detail: 'month and year must be valid numbers.' },
        { status: 400 }
      )
    }

    const period = await prisma.hrPayrollPeriod.findFirst({
      where: { companyId: companyIdInt, month: monthInt, year: yearInt },
    })
    if (period && (period.status === 'locked' || period.status === 'finalized')) {
      return NextResponse.json(
        { detail: `Cannot recalculate a ${period.status} payroll period.` },
        { status: 400 }
      )
    }

    const results = await calculateCompanyPayroll(companyIdInt, monthInt, yearInt)
    return NextResponse.json(results)
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Payroll calculation error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
