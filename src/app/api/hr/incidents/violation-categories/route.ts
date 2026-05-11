import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createViolationCategorySchema } from '@/lib/hr/validations'

function serializeCategory(c: any) {
  return {
    id: c.id,
    code: c.code,
    name_en: c.nameEn,
    name_ar: c.nameAr,
    name: c.nameEn,
    reset_period_months: c.resetPeriodMonths,
    created_at: c.createdAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth(request)

    const categories = await prisma.hrViolationCategory.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(categories.map(serializeCategory))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation categories list error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createViolationCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const category = await prisma.hrViolationCategory.create({
      data: {
        code: data.code,
        nameEn: data.name_en,
        nameAr: data.name_ar || '',
        resetPeriodMonths: data.reset_period_months || 12,
        createdAt: now,
      },
    })

    return NextResponse.json(serializeCategory(category), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation category create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
