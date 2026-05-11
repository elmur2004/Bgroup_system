import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { serializeEmployeeDetail } from '@/lib/hr/employee-serializer'

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)

    const employee = await prisma.hrEmployee.findUnique({
      where: { userId: authUser.id },
      include: { company: true, department: true, shift: true, directManager: true, user: true },
    })

    if (!employee) {
      return NextResponse.json(
        { detail: 'No employee profile linked to this account.' },
        { status: 400 }
      )
    }

    return NextResponse.json(serializeEmployeeDetail(employee))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
