import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateDepartmentSchema } from '@/lib/hr/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const dept = await prisma.hrDepartment.findUnique({
      where: { id: id },
      include: {
        company: true,
        headOfDept: true,
        employees: { where: { status: { in: ['active', 'probation'] } } },
      },
    })
    if (!dept) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })

    return NextResponse.json({
      id: dept.id,
      company: dept.companyId,
      company_name: dept.company.nameEn,
      name_en: dept.nameEn,
      name_ar: dept.nameAr,
      head_of_dept: dept.headOfDeptId,
      head_of_dept_name: dept.headOfDept?.fullNameEn || null,
      manager_name: dept.headOfDept?.fullNameEn || null,
      manager: dept.headOfDeptId,
      employee_count: dept.employees.length,
      is_active: dept.isActive,
      created_at: dept.createdAt.toISOString(),
      updated_at: dept.updatedAt.toISOString(),
    })
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
    const parsed = updateDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.company !== undefined) updateData.companyId = data.company
    if (data.head_of_dept !== undefined) updateData.headOfDeptId = data.head_of_dept
    if (data.manager !== undefined) updateData.headOfDeptId = data.manager
    if (data.is_active !== undefined) updateData.isActive = data.is_active

    await prisma.hrDepartment.update({ where: { id: pk }, data: updateData })

    const dept = await prisma.hrDepartment.findUnique({
      where: { id: pk },
      include: {
        company: true,
        headOfDept: true,
        employees: { where: { status: { in: ['active', 'probation'] } } },
      },
    })

    return NextResponse.json({
      id: dept!.id,
      company: dept!.companyId,
      company_name: dept!.company.nameEn,
      name_en: dept!.nameEn,
      name_ar: dept!.nameAr,
      head_of_dept: dept!.headOfDeptId,
      head_of_dept_name: dept!.headOfDept?.fullNameEn || null,
      manager_name: dept!.headOfDept?.fullNameEn || null,
      manager: dept!.headOfDeptId,
      employee_count: dept!.employees.length,
      is_active: dept!.isActive,
      created_at: dept!.createdAt.toISOString(),
      updated_at: dept!.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
