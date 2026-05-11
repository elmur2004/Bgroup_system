import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateShiftSchema } from '@/lib/hr/validations'

function serializeShift(s: any) {
  return {
    id: s.id,
    name: s.name,
    start_time: s.startTime,
    end_time: s.endTime,
    grace_period_minutes: s.gracePeriodMinutes,
    daily_work_hours: Number(s.dailyWorkHours),
    weekly_off_day: s.weeklyOffDay,
    is_default: s.isDefault,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params

    const shift = await prisma.hrShift.findUnique({
      where: { id: id },
    })
    if (!shift) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeShift(shift))
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
    const parsed = updateShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updateData.name = data.name
    if (data.start_time !== undefined) updateData.startTime = data.start_time
    if (data.end_time !== undefined) updateData.endTime = data.end_time
    if (data.grace_period_minutes !== undefined) updateData.gracePeriodMinutes = parseInt(String(data.grace_period_minutes))
    if (data.daily_work_hours !== undefined) updateData.dailyWorkHours = parseFloat(String(data.daily_work_hours))
    if (data.weekly_off_day !== undefined) updateData.weeklyOffDay = data.weekly_off_day
    if (data.is_default !== undefined) updateData.isDefault = data.is_default

    await prisma.hrShift.update({ where: { id: pk }, data: updateData })

    const shift = await prisma.hrShift.findUnique({ where: { id: pk } })

    return NextResponse.json(serializeShift(shift!))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Shift update error:', error)
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

    await prisma.hrShift.delete({ where: { id: pk } })
    return NextResponse.json({ detail: 'Shift deleted.' }, { status: 200 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
