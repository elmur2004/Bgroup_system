"use server";

import { db } from "@/lib/db";
import { scopeCompanyByRole } from "@/lib/crm/rbac";
import {
  createCompanySchema,
  updateCompanySchema,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@/lib/crm/validations/company";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/types";

export type CompanyFilters = {
  search?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

export async function getCompanies(session: SessionUser, filters?: CompanyFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const scopeWhere = scopeCompanyByRole(session);

  const searchWhere = filters?.search
    ? {
        OR: [
          { nameEn: { contains: filters.search, mode: "insensitive" as const } },
          { nameAr: { contains: filters.search, mode: "insensitive" as const } },
          { phone: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = { ...scopeWhere, ...searchWhere };

  const [companies, total] = await Promise.all([
    db.crmCompany.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: true,
            opportunities: true,
          },
        },
        assignedTo: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.crmCompany.count({ where }),
  ]);

  return JSON.parse(JSON.stringify({
    companies,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
}

export async function getCompany(session: SessionUser, id: string) {
  const scopeWhere = scopeCompanyByRole(session);

  const company = await db.crmCompany.findFirst({
    where: { id, ...scopeWhere },
    include: {
      assignedTo: {
        select: { id: true, fullName: true, fullNameAr: true },
      },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
      },
      opportunities: {
        include: {
          owner: { select: { id: true, fullName: true } },
          entity: { select: { id: true, code: true, nameEn: true, nameAr: true, color: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
      calls: {
        include: {
          caller: { select: { id: true, fullName: true } },
        },
        orderBy: { callAt: "desc" },
        take: 20,
      },
    },
  });

  if (!company) return null;

  const companyNotes = await db.crmNote.findMany({
    where: { companyId: id },
    include: {
      author: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(JSON.stringify({ ...company, companyNotes }));
}

export async function createCompany(session: SessionUser, data: CreateCompanyInput) {
  const parsed = createCompanySchema.parse(data);

  const company = await db.crmCompany.create({
    data: {
      ...parsed,
      assignedToId: session.id,
    },
  });

  revalidatePath("/crm/companies");
  return company;
}

export async function updateCompany(session: SessionUser, id: string, data: UpdateCompanyInput) {
  const parsed = updateCompanySchema.parse(data);

  // Verify user has access to this company
  const scopeWhere = scopeCompanyByRole(session);
  const existing = await db.crmCompany.findFirst({ where: { id, ...scopeWhere } });
  if (!existing) throw new Error("Company not found or access denied");

  const company = await db.crmCompany.update({
    where: { id },
    data: parsed,
  });

  revalidatePath("/crm/companies");
  revalidatePath(`/crm/companies/${id}`);
  return company;
}
