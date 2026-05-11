import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { serializeEmployeeDetail } from '@/lib/hr/employee-serializer'
import { changeEmployeeStatusSchema } from '@/lib/hr/validations'

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
    const parsed = changeEmployeeStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data

    await prisma.hrEmployee.update({
      where: { id: pk },
      data: { status: data.status, updatedAt: new Date() },
    })

    const employee = await prisma.hrEmployee.findUnique({
      where: { id: pk },
      include: { company: true, department: true, shift: true, directManager: true, user: true },
    })

    return NextResponse.json(serializeEmployeeDetail(employee!))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
