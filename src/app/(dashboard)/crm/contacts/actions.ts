"use server";

import { db } from "@/lib/db";
import { scopeCompanyByRole } from "@/lib/crm/rbac";
import {
  createContactSchema,
  updateContactSchema,
  type CreateContactInput,
  type UpdateContactInput,
} from "@/lib/crm/validations/contact";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/types";

export type ContactFilters = {
  search?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;

export async function getContacts(session: SessionUser, filters?: ContactFilters) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? DEFAULT_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const companyScope = scopeCompanyByRole(session);

  const searchWhere = filters?.search
    ? {
        OR: [
          { fullName: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
          { phone: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const companyFilter = filters?.companyId
    ? { companyId: filters.companyId }
    : {};

  const where = {
    ...searchWhere,
    ...companyFilter,
    company: companyScope,
  };

  const [contacts, total] = await Promise.all([
    db.crmContact.findMany({
      where,
      include: {
        company: {
          select: { id: true, nameEn: true, nameAr: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
      skip,
      take: pageSize,
    }),
    db.crmContact.count({ where }),
  ]);

  return JSON.parse(JSON.stringify({
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }));
}

export async function getContact(session: SessionUser, id: string) {
  const companyScope = scopeCompanyByRole(session);

  const contact = await db.crmContact.findFirst({
    where: { id, company: companyScope },
    include: {
      company: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          industry: true,
          phone: true,
          city: true,
          category: true,
          assignedToId: true,
        },
      },
      opportunities: {
        include: {
          owner: { select: { id: true, fullName: true } },
          entity: { select: { id: true, code: true, nameEn: true, nameAr: true, color: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return contact ? JSON.parse(JSON.stringify(contact)) : null;
}

export async function createContact(session: SessionUser, data: CreateContactInput) {
  const parsed = createContactSchema.parse(data);

  // Verify user has access to the target company
  const companyScope = scopeCompanyByRole(session);
  const company = await db.crmCompany.findFirst({
    where: { id: parsed.companyId, ...companyScope },
  });
  if (!company) throw new Error("Company not found or access denied");

  // CRM Req. spec — phone numbers must be unique across the entire CRM. Block
  // creation if any existing contact already has the same digits.
  if (parsed.phone) {
    const normalized = parsed.phone.replace(/[^\d]/g, "");
    if (normalized.length >= 7) {
      const existing = await db.crmContact.findFirst({
        where: { phone: { contains: normalized } },
        select: { id: true, fullName: true, company: { select: { nameEn: true } } },
      });
      if (existing) {
        throw new Error(
          `Phone number already exists on contact "${existing.fullName}" (${existing.company?.nameEn ?? "—"})`
        );
      }
    }
  }

  const contact = await db.crmContact.create({
    data: parsed,
  });

  revalidatePath("/crm/contacts");
  revalidatePath(`/crm/companies/${parsed.companyId}`);
  return contact;
}

export async function updateContact(session: SessionUser, id: string, data: UpdateContactInput) {
  const parsed = updateContactSchema.parse(data);

  // Verify user has access to this contact's company
  const companyScope = scopeCompanyByRole(session);
  const existing = await db.crmContact.findFirst({
    where: { id, company: companyScope },
  });
  if (!existing) throw new Error("Contact not found or access denied");

  const contact = await db.crmContact.update({
    where: { id },
    data: parsed,
  });

  revalidatePath("/crm/contacts");
  revalidatePath(`/crm/contacts/${id}`);
  return contact;
}
