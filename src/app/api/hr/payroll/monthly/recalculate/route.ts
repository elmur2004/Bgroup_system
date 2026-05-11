import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { calculateCompanyPayroll } from '@/lib/hr/payroll-engine'
import { payrollMonthlyActionSchema } from '@/lib/hr/validations'

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = payrollMonthlyActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { company, month, year } = parsed.data

    const now = new Date()
    const m = month !== undefined ? parseInt(String(month), 10) : now.getMonth() + 1
    const y = year !== undefined ? parseInt(String(year), 10) : now.getFullYear()

    const results = await calculateCompanyPayroll(company, m, y)
    return NextResponse.json({ detail: `Recalculated ${results.processed.length} records.` })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Recalculate error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
