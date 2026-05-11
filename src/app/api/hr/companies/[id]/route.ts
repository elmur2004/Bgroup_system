import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { updateCompanySchema } from '@/lib/hr/validations'

async function serializeCompanyDetail(id: string) {
  const company = await prisma.hrCompany.findUnique({
    where: { id },
    include: {
      departments: {
        include: {
          headOfDept: true,
          employees: { where: { status: { in: ['active', 'probation'] } } },
        },
      },
      employees: true,
    },
  })
  if (!company) return null

  return {
    id: company.id,
    name_en: company.nameEn,
    name_ar: company.nameAr,
    logo: company.logo,
    industry: company.industry,
    address: company.address,
    phone: company.phone,
    email: company.email,
    tax_id: company.taxId,
    is_active: company.isActive,
    created_at: company.createdAt.toISOString(),
    updated_at: company.updatedAt.toISOString(),
    employee_count: company.employees.filter((e) => ['active', 'probation'].includes(e.status)).length,
    departments: company.departments.map((d) => ({
      id: d.id,
      company: d.companyId,
      company_name: company.nameEn,
      name_en: d.nameEn,
      name_ar: d.nameAr,
      head_of_dept: d.headOfDeptId,
      head_of_dept_name: d.headOfDept?.fullNameEn || null,
      manager_name: d.headOfDept?.fullNameEn || null,
      manager: d.headOfDeptId,
      employee_count: d.employees.length,
      is_active: d.isActive,
      created_at: d.createdAt.toISOString(),
      updated_at: d.updatedAt.toISOString(),
    })),
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request)
    const { id } = await params
    const data = await serializeCompanyDetail(id)
    if (!data) return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
    return NextResponse.json(data)
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
    const parsed = updateCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const data = parsed.data

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name_en !== undefined) updateData.nameEn = data.name_en
    if (data.name_ar !== undefined) updateData.nameAr = data.name_ar
    if (data.logo !== undefined) updateData.logo = data.logo
    if (data.industry !== undefined) updateData.industry = data.industry
    if (data.address !== undefined) updateData.address = data.address
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.tax_id !== undefined) updateData.taxId = data.tax_id
    if (data.is_active !== undefined) updateData.isActive = data.is_active

    await prisma.hrCompany.update({ where: { id: pk }, data: updateData })

    const serialized = await serializeCompanyDetail(pk)
    return NextResponse.json(serialized)
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
