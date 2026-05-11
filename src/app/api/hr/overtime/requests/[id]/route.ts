import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateOvertimeRequestSchema } from '@/lib/hr/validations'

const overtimeRequestIncludes = {
  employee: {
    include: {
      company: true,
      department: true,
    },
  },
  overtimePolicy: true,
  approvedBy: true,
}

function serializeOvertimeRequest(r: any) {
  return {
    id: r.id,
    employee: r.employeeId,
    employee_name: r.employee?.fullNameEn || '',
    employee_id_str: r.employee?.employeeId || '',
    department_name: r.employee?.department?.nameEn || '',
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
    overtime_type: r.overtimeTypeId,
    overtime_type_name: r.overtimePolicy?.nameEn || '',
    rate_multiplier: r.overtimePolicy ? parseFloat(r.overtimePolicy.rateMultiplier) : null,
    hours_requested: parseFloat(r.hoursRequested),
    reason: r.reason,
    evidence: r.evidence || null,
    status: r.status,
    approved_by: r.approvedById,
    approved_by_name: r.approvedBy
      ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}`.trim()
      : null,
    approved_at: r.approvedAt ? r.approvedAt.toISOString() : null,
    denial_reason: r.denialReason || '',
    calculated_amount: parseFloat(r.calculatedAmount),
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params
    const pk = id

    const otRequest = await prisma.hrOvertimeRequest.findUnique({
      where: { id: pk },
      include: overtimeRequestIncludes,
    })
    if (!otRequest) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    if (!isHROrAdmin(authUser)) {
      const ownEmp = await prisma.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      })
      if (!ownEmp || otRequest.employeeId !== ownEmp.id) {
        return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
      }
    }

    return NextResponse.json(serializeOvertimeRequest(otRequest))
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
    const parsed = updateOvertimeRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.overtime_type !== undefined) updateData.overtimeTypeId = data.overtime_type
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.hours_requested !== undefined) updateData.hoursRequested = parseFloat(String(data.hours_requested))
    if (data.reason !== undefined) updateData.reason = data.reason
    if (data.evidence !== undefined) updateData.evidence = data.evidence

    const otRequest = await prisma.hrOvertimeRequest.update({
      where: { id: pk },
      data: updateData,
      include: overtimeRequestIncludes,
    })

    return NextResponse.json(serializeOvertimeRequest(otRequest))
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Overtime request update error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
