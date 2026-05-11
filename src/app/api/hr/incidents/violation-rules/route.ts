import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createViolationRuleSchema } from '@/lib/hr/validations'

function serializeRule(r: any) {
  return {
    id: r.id,
    category: r.categoryId,
    category_name: r.category?.nameEn || '',
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    offense_1: { action: r.offense1Action, deduction_pct: parseFloat(String(r.offense1DeductionPct)) },
    offense_2: { action: r.offense2Action, deduction_pct: parseFloat(String(r.offense2DeductionPct)) },
    offense_3: { action: r.offense3Action, deduction_pct: parseFloat(String(r.offense3DeductionPct)) },
    offense_4: { action: r.offense4Action, deduction_pct: parseFloat(String(r.offense4DeductionPct)) },
    offense_5: { action: r.offense5Action, deduction_pct: parseFloat(String(r.offense5DeductionPct)) },
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const url = new URL(request.url)

    const where: any = {}
    const category = url.searchParams.get('category')
    if (category) where.categoryId = category

    const rules = await prisma.hrViolationRule.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(rules.map(serializeRule))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation rules list error:', error)
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
    const parsed = createViolationRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const rule = await prisma.hrViolationRule.create({
      data: {
        code: data.code,
        nameEn: data.name_en,
        nameAr: data.name_ar || '',
        categoryId: data.category,
        offense1Action: data.offense_1?.action || '',
        offense1DeductionPct: data.offense_1?.deduction_pct !== undefined ? Number(data.offense_1.deduction_pct) || 0 : 0,
        offense2Action: data.offense_2?.action || '',
        offense2DeductionPct: data.offense_2?.deduction_pct !== undefined ? Number(data.offense_2.deduction_pct) || 0 : 0,
        offense3Action: data.offense_3?.action || '',
        offense3DeductionPct: data.offense_3?.deduction_pct !== undefined ? Number(data.offense_3.deduction_pct) || 0 : 0,
        offense4Action: data.offense_4?.action || '',
        offense4DeductionPct: data.offense_4?.deduction_pct !== undefined ? Number(data.offense_4.deduction_pct) || 0 : 0,
        offense5Action: data.offense_5?.action || '',
        offense5DeductionPct: data.offense_5?.deduction_pct !== undefined ? Number(data.offense_5.deduction_pct) || 0 : 0,
        createdAt: now,
        updatedAt: now,
      },
      include: { category: true },
    })

    return NextResponse.json(serializeRule(rule), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation rule create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
