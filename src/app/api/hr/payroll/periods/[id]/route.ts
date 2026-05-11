import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'
import { updatePayrollPeriodSchema } from '@/lib/hr/validations'

function serializePeriod(p: any) {
  return {
    id: p.id,
    company: p.companyId,
    company_name: p.company?.nameEn || '',
    month: p.month,
    year: p.year,
    status: p.status,
    locked_by: p.lockedById,
    locked_by_email: p.lockedBy?.email || null,
    locked_at: p.lockedAt?.toISOString() || null,
    finalized_at: p.finalizedAt?.toISOString() || null,
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
    const period = await prisma.hrPayrollPeriod.findUnique({
      where: { id: id },
      include: { company: true, lockedBy: true },
    })
    if (!period) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    return NextResponse.json(serializePeriod(period))
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
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const parsed = updatePayrollPeriodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.status !== undefined) updateData.status = data.status
    if (data.month !== undefined) updateData.month = typeof data.month === 'number' ? data.month : parseInt(String(data.month), 10)
    if (data.year !== undefined) updateData.year = typeof data.year === 'number' ? data.year : parseInt(String(data.year), 10)

    const period = await prisma.hrPayrollPeriod.update({
      where: { id: id },
      data: updateData,
      include: { company: true, lockedBy: true },
    })
    return NextResponse.json(serializePeriod(period))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }
    const { id } = await params
    await prisma.hrPayrollPeriod.delete({ where: { id: id } })
    return NextResponse.json({ detail: 'Deleted.' })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
