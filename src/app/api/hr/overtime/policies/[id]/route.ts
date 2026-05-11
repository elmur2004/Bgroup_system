import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateOvertimePolicySchema } from '@/lib/hr/validations'

function serializePolicy(p: any) {
  return {
    id: p.id,
    type_code: p.typeCode,
    name_en: p.nameEn,
    name_ar: p.nameAr,
    rate_multiplier: parseFloat(p.rateMultiplier),
    min_hours: parseFloat(p.minHours),
    max_hours_per_day: parseFloat(p.maxHoursPerDay),
    max_hours_per_month: parseFloat(p.maxHoursPerMonth),
    requires_pre_approval: p.requiresPreApproval,
    approval_authority: p.approvalAuthority,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
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

    const policy = await prisma.hrOvertimePolicy.findUnique({ where: { id: pk } })
    if (!policy) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializePolicy(policy))
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
    const parsed = updateOvertimePolicySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.type_code !== undefined) updateData.typeCode = data.type_code
    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.rate_multiplier !== undefined) updateData.rateMultiplier = Number(data.rate_multiplier)
    if (data.min_hours !== undefined) updateData.minHours = Number(data.min_hours)
    if (data.max_hours_per_day !== undefined) updateData.maxHoursPerDay = Number(data.max_hours_per_day)
    if (data.max_hours_per_month !== undefined) updateData.maxHoursPerMonth = Number(data.max_hours_per_month)
    if (data.requires_pre_approval !== undefined) updateData.requiresPreApproval = data.requires_pre_approval
    if (data.approval_authority !== undefined) updateData.approvalAuthority = data.approval_authority

    const policy = await prisma.hrOvertimePolicy.update({
      where: { id: pk },
      data: updateData,
    })

    return NextResponse.json(serializePolicy(policy))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime policy update error:', error)
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

    await prisma.hrOvertimePolicy.delete({ where: { id: pk } })

    return NextResponse.json({ detail: 'Deleted.' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime policy delete error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
