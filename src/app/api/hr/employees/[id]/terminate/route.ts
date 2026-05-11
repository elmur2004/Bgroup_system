import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { serializeEmployeeDetail } from '@/lib/hr/employee-serializer'

export async function POST(
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

    await prisma.hrEmployee.update({
      where: { id: pk },
      data: { status: 'terminated', updatedAt: new Date() },
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
