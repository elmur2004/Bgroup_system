import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { createPayrollPeriodSchema } from '@/lib/hr/validations'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const where: Record<string, unknown> = {}
    if (company) where.companyId = company
    if (status) where.status = status
    if (year) where.year = year
    if (month) where.month = month

    const periods = await prisma.hrPayrollPeriod.findMany({
      where,
      include: { company: true, lockedBy: { include: { user: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(
      periods.map((p) => ({
        id: p.id,
        company: p.companyId,
        company_name: p.company.nameEn,
        month: p.month,
        year: p.year,
        status: p.status,
        locked_by: p.lockedById,
        locked_by_email: p.lockedBy?.user?.email || null,
        locked_at: p.lockedAt?.toISOString() || null,
        finalized_at: p.finalizedAt?.toISOString() || null,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      }))
    )
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createPayrollPeriodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const { company, month, year } = parsed.data

    const now = new Date()
    const period = await prisma.hrPayrollPeriod.create({
      data: {
        companyId: company,
        month: typeof month === 'number' ? month : parseInt(String(month), 10),
        year: typeof year === 'number' ? year : parseInt(String(year), 10),
        status: 'open',
        createdAt: now,
        updatedAt: now,
      },
      include: { company: true, lockedBy: { include: { user: true } } },
    })

    return NextResponse.json({
      id: period.id,
      company: period.companyId,
      company_name: period.company.nameEn,
      month: period.month,
      year: period.year,
      status: period.status,
      locked_by: null,
      locked_by_email: null,
      locked_at: null,
      finalized_at: null,
      created_at: period.createdAt.toISOString(),
      updated_at: period.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
