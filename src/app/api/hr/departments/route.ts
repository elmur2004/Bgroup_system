import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin, canViewAllEmployees } from '@/lib/hr/permissions'
import { createDepartmentSchema } from '@/lib/hr/validations'

function serializeDepartment(d: any) {
  return {
    id: d.id,
    company: d.companyId,
    company_name: d.company?.nameEn || '',
    name_en: d.nameEn,
    name_ar: d.nameAr,
    head_of_dept: d.headOfDeptId,
    head_of_dept_name: d.headOfDept?.fullNameEn || null,
    manager_name: d.headOfDept?.fullNameEn || null,
    manager: d.headOfDeptId,
    employee_count: d._count?.employees ?? d.employees?.filter((e: any) => ['active', 'probation'].includes(e.status)).length ?? 0,
    is_active: d.isActive,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  }
}

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth(request)
    const url = new URL(request.url)
    const companyId = url.searchParams.get('company')
    const isActive = url.searchParams.get('is_active')
    const search = url.searchParams.get('search')

    const where: any = {}
    if (companyId) where.companyId = companyId
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (search) {
      where.OR = [
        { nameEn: { contains: search } },
        { nameAr: { contains: search } },
      ]
    }
    if (!canViewAllEmployees(authUser)) {
      where.companyId = { in: authUser.companies }
    }

    const departments = await prisma.hrDepartment.findMany({
      where,
      include: {
        company: true,
        headOfDept: true,
        employees: { where: { status: { in: ['active', 'probation'] } } },
      },
      orderBy: { nameEn: 'asc' },
    })

    return NextResponse.json(departments.map(serializeDepartment))
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request)
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: 'Permission denied.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data
    const now = new Date()

    const dept = await prisma.hrDepartment.create({
      data: {
        nameEn: data.name_en || '',
        nameAr: data.name_ar || '',
        companyId: data.company,
        headOfDeptId: data.head_of_dept || data.manager || null,
        isActive: data.is_active ?? true,
        createdAt: now,
        updatedAt: now,
      },
      include: { company: true, headOfDept: true, employees: true },
    })

    return NextResponse.json(serializeDepartment(dept), { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
