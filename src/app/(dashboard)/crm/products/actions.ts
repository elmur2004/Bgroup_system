"use server";

import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/crm/session";

export type ProductFilters = {
  entityId?: string;
  category?: string;
  active?: boolean;
  search?: string;
};

function isCrossEntityRole(role: string | null | undefined): boolean {
  return role === "CEO" || role === "ADMIN";
}

export async function getProducts(filters?: ProductFilters) {
  const session = await getRequiredSession();
  const where: Record<string, unknown> = {};

  // Non-admin roles only see their own entity's products
  if (!isCrossEntityRole(session.role) && session.entityId) {
    where.entityId = session.entityId;
  } else if (filters?.entityId) {
    where.entityId = filters.entityId;
  }

  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.active !== undefined) {
    where.active = filters.active;
  }
  if (filters?.search) {
    where.OR = [
      { nameEn: { contains: filters.search, mode: "insensitive" as const } },
      { nameAr: { contains: filters.search, mode: "insensitive" as const } },
      { code: { contains: filters.search, mode: "insensitive" as const } },
    ];
  }

  const products = await db.crmProduct.findMany({
    where,
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true, color: true },
      },
    },
    orderBy: [{ entity: { code: "asc" } }, { category: "asc" }, { nameEn: "asc" }],
  });

  return JSON.parse(JSON.stringify(products));
}

export async function getProduct(id: string) {
  const session = await getRequiredSession();
  const product = await db.crmProduct.findUnique({
    where: { id },
    include: {
      entity: {
        select: { id: true, code: true, nameEn: true, nameAr: true, color: true },
      },
    },
  });

  if (!product) return null;
  if (!isCrossEntityRole(session.role) && session.entityId && product.entityId !== session.entityId) {
    return null;
  }

  return JSON.parse(JSON.stringify(product));
}
