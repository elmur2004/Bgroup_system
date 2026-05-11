import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateViolationRuleSchema } from '@/lib/hr/validations'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const pk = id

    const rule = await prisma.hrViolationRule.findUnique({
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
    const parsed = updateViolationRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.code !== undefined) updateData.code = data.code
    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.category !== undefined) updateData.categoryId = data.category
    if (data.offense_1 !== undefined) {
      updateData.offense1Action = data.offense_1?.action || ''
      updateData.offense1DeductionPct = data.offense_1?.deduction_pct !== undefined ? Number(data.offense_1.deduction_pct) || 0 : 0
    }
    if (data.offense_2 !== undefined) {
      updateData.offense2Action = data.offense_2?.action || ''
      updateData.offense2DeductionPct = data.offense_2?.deduction_pct !== undefined ? Number(data.offense_2.deduction_pct) || 0 : 0
    }
    if (data.offense_3 !== undefined) {
      updateData.offense3Action = data.offense_3?.action || ''
      updateData.offense3DeductionPct = data.offense_3?.deduction_pct !== undefined ? Number(data.offense_3.deduction_pct) || 0 : 0
    }
    if (data.offense_4 !== undefined) {
      updateData.offense4Action = data.offense_4?.action || ''
      updateData.offense4DeductionPct = data.offense_4?.deduction_pct !== undefined ? Number(data.offense_4.deduction_pct) || 0 : 0
    }
    if (data.offense_5 !== undefined) {
      updateData.offense5Action = data.offense_5?.action || ''
      updateData.offense5DeductionPct = data.offense_5?.deduction_pct !== undefined ? Number(data.offense_5.deduction_pct) || 0 : 0
    }

    const rule = await prisma.hrViolationRule.update({
      where: { id: pk },
      data: updateData,
      include: { category: true },
    })

    return NextResponse.json(serializeRule(rule))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation rule update error:', error)
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

    await prisma.hrViolationRule.delete({ where: { id: pk } })

    return NextResponse.json({ detail: 'Deleted.' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Violation rule delete error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
