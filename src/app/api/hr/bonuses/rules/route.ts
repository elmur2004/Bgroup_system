import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createBonusRuleSchema } from '@/lib/hr/validations'

function serializeRule(r: any) {
  return {
    id: r.id,
    category: r.categoryId,
    category_name: r.category?.nameEn || '',
    code: r.code,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    value_type: r.valueType,
    value_type_display: r.valueType === 'fixed' ? 'Fixed' : r.valueType === 'percentage' ? 'Percentage' : r.valueType,
    value: parseFloat(String(r.value)),
    frequency: r.frequency,
    frequency_display: r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1),
    max_per_month: r.maxPerMonth,
    approval_authority: r.approvalAuthority,
    trigger_condition: r.triggerCondition,
    // Aliases for frontend compatibility
    calculation_type: r.valueType,
    default_amount: parseFloat(String(r.value)),
    percentage_of_salary: r.valueType === 'percentage' ? parseFloat(String(r.value)) : null,
    description: r.triggerCondition,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const url = new URL(request.url)

    const where: any = {}
    const category = url.searchParams.get('category') || url.searchParams.get('category_id')
    const valueType = url.searchParams.get('value_type')
    const frequency = url.searchParams.get('frequency')

    if (category) where.categoryId = category
    if (valueType) where.valueType = valueType
    if (frequency) where.frequency = frequency

    const rules = await prisma.hrBonusRule.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(rules.map(serializeRule))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus rules list error:', error)
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
    const parsed = createBonusRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const rule = await prisma.hrBonusRule.create({
      data: {
        code: data.code,
        nameEn: data.name_en,
        nameAr: data.name_ar || '',
        categoryId: data.category,
        valueType: data.value_type,
        value: data.value,
        frequency: data.frequency || 'one_time',
        maxPerMonth: data.max_per_month || 1,
        approvalAuthority: data.approval_authority || 'hr_manager',
        triggerCondition: data.trigger_condition || '',
        createdAt: now,
        updatedAt: now,
      },
      include: { category: true },
    })

    return NextResponse.json(serializeRule(rule), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus rule create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
