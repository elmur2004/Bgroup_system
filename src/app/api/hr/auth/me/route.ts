import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { serializeUser } from '@/lib/hr/serializers'
import { updateMeSchema } from '@/lib/hr/validations'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const userData = await serializeUser(authUser.id)
    return NextResponse.json(userData)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const body = await request.json()
    const parsed = updateMeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data

    const updateData: Record<string, unknown> = {}
    if (data.first_name !== undefined) updateData.firstName = data.first_name
    if (data.last_name !== undefined) updateData.lastName = data.last_name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.avatar !== undefined) updateData.avatar = data.avatar
    updateData.updatedAt = new Date()

    await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
    })

    const userData = await serializeUser(authUser.id)
    return NextResponse.json(userData)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
