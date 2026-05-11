import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isSuperAdmin } from '@/lib/hr/permissions'
import { updateSettingSchema } from '@/lib/hr/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await requireAuth(request)
    const { key } = await params
    const setting = await prisma.hrAppSetting.findUnique({ where: { key } })
    if (!setting) {
      return NextResponse.json({ detail: 'Setting not found.' }, { status: 404 })
    }
    return NextResponse.json({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      category: setting.category,
      created_at: setting.createdAt.toISOString(),
      updated_at: setting.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!isSuperAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { key } = await params
    const setting = await prisma.hrAppSetting.findUnique({ where: { key } })
    if (!setting) {
      return NextResponse.json({ detail: 'Setting not found.' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSettingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updated = await prisma.hrAppSetting.update({
      where: { key },
      data: {
        value: data.value !== undefined ? String(data.value) : setting.value,
        description: data.description !== undefined ? data.description : setting.description,
        category: data.category !== undefined ? data.category : setting.category,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: updated.id,
      key: updated.key,
      value: updated.value,
      description: updated.description,
      category: updated.category,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
