import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { canManagePayroll } from '@/lib/hr/permissions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    if (!canManagePayroll(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const { id } = await params
    const salary = await prisma.hrMonthlySalary.findUnique({
      where: { id: id },
    })
    if (!salary) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    if (salary.status !== 'locked') {
      return NextResponse.json({ detail: 'Only locked records can be finalized.' }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.hrMonthlySalary.update({
      where: { id: salary.id },
      data: {
        status: 'finalized',
        finalizedAt: now,
        updatedAt: now,
      },
      include: {
        employee: { include: { company: true, department: true } },
        lockedBy: true,
      },
    })

    return NextResponse.json({
      id: updated.id,
      employee: updated.employeeId,
      employee_name: updated.employee.fullNameEn,
      status: updated.status,
      net_salary: Number(updated.netSalary),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
