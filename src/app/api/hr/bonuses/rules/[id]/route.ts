import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateBonusRuleSchema } from '@/lib/hr/validations'

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
    calculation_type: r.valueType,
    default_amount: parseFloat(String(r.value)),
    percentage_of_salary: r.valueType === 'percentage' ? parseFloat(String(r.value)) : null,
    description: r.triggerCondition,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const pk = id

    const rule = await prisma.hrBonusRule.findUnique({
      where: { id: pk },
      include: { category: true },
    })
    if (!rule) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeRule(rule))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const pk = id
    const body = await request.json()
    const parsed = updateBonusRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.code !== undefined) updateData.code = data.code
    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.category !== undefined) updateData.categoryId = data.category
    if (data.value_type !== undefined) updateData.valueType = data.value_type
    if (data.value !== undefined) updateData.value = data.value
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.max_per_month !== undefined) updateData.maxPerMonth = data.max_per_month
    if (data.approval_authority !== undefined) updateData.approvalAuthority = data.approval_authority
    if (data.trigger_condition !== undefined) updateData.triggerCondition = data.trigger_condition

    const rule = await prisma.hrBonusRule.update({
      where: { id: pk },
      data: updateData,
      include: { category: true },
    })

    return NextResponse.json(serializeRule(rule))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus rule update error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const pk = id

    await prisma.hrBonusRule.delete({ where: { id: pk } })

    return NextResponse.json({ detail: 'Deleted.' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus rule delete error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
