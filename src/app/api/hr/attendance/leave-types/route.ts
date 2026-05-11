import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { createLeaveTypeSchema } from '@/lib/hr/validations'

function serializeLeaveType(lt: any) {
  return {
    id: lt.id,
    name_en: lt.nameEn,
    name_ar: lt.nameAr,
    annual_days: lt.annualDays,
    is_paid: lt.isPaid,
    carry_over_allowed: lt.carryOverAllowed,
    max_carry_over_days: lt.maxCarryOverDays,
    created_at: lt.createdAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    await requireAuth(request)

    const leaveTypes = await prisma.hrLeaveType.findMany({
      orderBy: { nameEn: 'asc' },
    })

    return NextResponse.json(leaveTypes.map(serializeLeaveType))
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
    const parsed = createLeaveTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const leaveType = await prisma.hrLeaveType.create({
      data: {
        nameEn: data.name_en || '',
        nameAr: data.name_ar || '',
        annualDays: data.annual_days !== undefined ? parseInt(String(data.annual_days)) || 0 : 0,
        isPaid: data.is_paid ?? true,
        carryOverAllowed: data.carry_over_allowed ?? false,
        maxCarryOverDays: data.max_carry_over_days !== undefined ? parseInt(String(data.max_carry_over_days)) || 0 : 0,
        createdAt: now,
      },
    })

    return NextResponse.json(serializeLeaveType(leaveType), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave type create error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
