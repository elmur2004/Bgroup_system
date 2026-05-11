import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createShiftSchema } from '@/lib/hr/validations'

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

export async function GET(request: Request) {
  try {
    await requireAuth(request)

    const shifts = await prisma.hrShift.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(shifts.map(serializeShift))
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
    const parsed = createShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const shift = await prisma.hrShift.create({
      data: {
        name: data.name || '',
        startTime: data.start_time || '09:00',
        endTime: data.end_time || '17:00',
        gracePeriodMinutes: data.grace_period_minutes !== undefined ? parseInt(String(data.grace_period_minutes)) || 15 : 15,
        dailyWorkHours: data.daily_work_hours !== undefined ? parseFloat(String(data.daily_work_hours)) || 8 : 8,
        weeklyOffDay: data.weekly_off_day ?? 5,
        isDefault: data.is_default ?? false,
        createdAt: now,
        updatedAt: now,
      },
    })

    return NextResponse.json(serializeShift(shift), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Shift create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
