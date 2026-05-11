import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createAutoRuleSchema } from '@/lib/hr/validations'

function serializeAutoRule(r: any) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    condition_description: r.conditionDescription,
    threshold_value: r.thresholdValue,
    time_window_months: r.timeWindowMonths,
    action: r.action,
    is_active: r.isActive,
    created_at: r.createdAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const rules = await prisma.hrAttendanceAutoRule.findMany({
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(rules.map(serializeAutoRule))
  } catch (error) {
    if (error instanceof Response) return error
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
    const parsed = createAutoRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const rule = await prisma.hrAttendanceAutoRule.create({
      data: {
        code: data.code || '',
        name: data.name || '',
        conditionDescription: data.condition_description || '',
        thresholdValue: data.threshold_value !== undefined ? parseInt(String(data.threshold_value)) || 0 : 0,
        timeWindowMonths: data.time_window_months !== undefined ? parseInt(String(data.time_window_months)) || 1 : 1,
        action: data.action || '',
        isActive: data.is_active ?? true,
        createdAt: now,
      },
    })

    return NextResponse.json(serializeAutoRule(rule), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Auto rule create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
