import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { serializeEmployeeList } from '@/lib/hr/employee-serializer'

export async function GET(request: Request) {
  try {
    await requireAuth(request)
    const url = new URL(request.url)
    const deptId = url.searchParams.get('department_id')

    if (!deptId) {
      return NextResponse.json({ detail: 'department_id is required.' }, { status: 400 })
    }

    const employees = await prisma.hrEmployee.findMany({
      where: { departmentId: deptId },
      include: { company: true, department: true, shift: true, directManager: true, user: true },
      orderBy: { employeeId: 'asc' },
    })

    return NextResponse.json(employees.map(serializeEmployeeList))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
