import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createOvertimePolicySchema } from '@/lib/hr/validations'

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

export async function GET(request: Request) {
  try {
    await requireAuth(request)

    const policies = await prisma.hrOvertimePolicy.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(policies.map(serializePolicy))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime policies list error:', error)
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
    const parsed = createOvertimePolicySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const policy = await prisma.hrOvertimePolicy.create({
      data: {
        typeCode: data.type_code,
        nameEn: data.name_en,
        nameAr: data.name_ar || '',
        rateMultiplier: Number(data.rate_multiplier),
        minHours: data.min_hours !== undefined ? Number(data.min_hours) || 0 : 0,
        maxHoursPerDay: data.max_hours_per_day !== undefined ? Number(data.max_hours_per_day) || 24 : 24,
        maxHoursPerMonth: data.max_hours_per_month !== undefined ? Number(data.max_hours_per_month) || 720 : 720,
        requiresPreApproval: data.requires_pre_approval ?? false,
        approvalAuthority: data.approval_authority || 'hr_manager',
        createdAt: now,
        updatedAt: now,
      },
    })

    return NextResponse.json(serializePolicy(policy), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime policy create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
