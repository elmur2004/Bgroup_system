import { db } from "@/lib/db";

export async function findDuplicateCompanies(
  nameEn: string,
  phone?: string | null
) {
  const conditions = [];

  // Name similarity — exact or substring match
  if (nameEn) {
    conditions.push({
      nameEn: { contains: nameEn, mode: "insensitive" as const },
    });
  }

  // Phone exact match
  if (phone) {
    conditions.push({ phone });
  }

  if (conditions.length === 0) return [];

  return db.crmCompany.findMany({
    where: { OR: conditions },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      phone: true,
      city: true,
    },
    take: 5,
  });
}

export async function findDuplicateContacts(
  email?: string | null,
  phone?: string | null,
  companyId?: string | null
) {
  const conditions = [];

  if (email) {
    conditions.push({ email });
  }

  if (phone) {
    conditions.push({ phone });
  }

  if (conditions.length === 0) return [];

  return db.crmContact.findMany({
    where: {
      OR: conditions,
      ...(companyId ? { companyId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      company: { select: { nameEn: true } },
    },
    take: 5,
  });
}
