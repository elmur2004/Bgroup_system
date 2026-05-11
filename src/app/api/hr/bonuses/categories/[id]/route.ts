import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateBonusCategorySchema } from '@/lib/hr/validations'

function serializeCategory(c: any) {
  return {
    id: c.id,
    code: c.code,
    name_en: c.nameEn,
    name_ar: c.nameAr,
    name: c.nameEn,
    created_at: c.createdAt.toISOString(),
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

    const category = await prisma.hrBonusCategory.findUnique({ where: { id: pk } })
    if (!category) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json(serializeCategory(category))
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
    const parsed = updateBonusCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.code !== undefined) updateData.code = data.code
    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar

    const category = await prisma.hrBonusCategory.update({
      where: { id: pk },
      data: updateData,
    })

    return NextResponse.json(serializeCategory(category))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus category update error:', error)
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

    await prisma.hrBonusCategory.delete({ where: { id: pk } })

    return NextResponse.json({ detail: 'Deleted.' })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Bonus category delete error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
