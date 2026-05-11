import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateAutoRuleSchema } from '@/lib/hr/validations'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params

    const rule = await prisma.hrAttendanceAutoRule.findUnique({
      where: { id: id },
    })
    if (!rule) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeAutoRule(rule))
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
    const parsed = updateAutoRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.code !== undefined) updateData.code = data.code
    if (data.name !== undefined) updateData.name = data.name
    if (data.condition_description !== undefined) updateData.conditionDescription = data.condition_description
    if (data.threshold_value !== undefined) updateData.thresholdValue = parseInt(String(data.threshold_value))
    if (data.time_window_months !== undefined) updateData.timeWindowMonths = parseInt(String(data.time_window_months))
    if (data.action !== undefined) updateData.action = data.action
    if (data.is_active !== undefined) updateData.isActive = data.is_active

    await prisma.hrAttendanceAutoRule.update({ where: { id: pk }, data: updateData })

    const rule = await prisma.hrAttendanceAutoRule.findUnique({ where: { id: pk } })

    return NextResponse.json(serializeAutoRule(rule!))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Auto rule update error:', error)
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

    await prisma.hrAttendanceAutoRule.delete({ where: { id: pk } })
    return NextResponse.json({ detail: 'Auto rule deleted.' }, { status: 200 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
