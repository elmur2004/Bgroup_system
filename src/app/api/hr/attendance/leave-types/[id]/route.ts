import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateLeaveTypeSchema } from '@/lib/hr/validations'

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params

    const leaveType = await prisma.hrLeaveType.findUnique({
      where: { id: id },
    })
    if (!leaveType) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeLeaveType(leaveType))
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
    const parsed = updateLeaveTypeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.annual_days !== undefined) updateData.annualDays = parseInt(String(data.annual_days))
    if (data.is_paid !== undefined) updateData.isPaid = data.is_paid
    if (data.carry_over_allowed !== undefined) updateData.carryOverAllowed = data.carry_over_allowed
    if (data.max_carry_over_days !== undefined) updateData.maxCarryOverDays = parseInt(String(data.max_carry_over_days))

    await prisma.hrLeaveType.update({ where: { id: pk }, data: updateData })

    const leaveType = await prisma.hrLeaveType.findUnique({ where: { id: pk } })

    return NextResponse.json(serializeLeaveType(leaveType!))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Leave type update error:', error)
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

    await prisma.hrLeaveType.delete({ where: { id: pk } })
    return NextResponse.json({ detail: 'Leave type deleted.' }, { status: 200 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
