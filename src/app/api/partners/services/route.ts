import { db } from "@/lib/db";
import { requirePartnerAuth, requireAdmin, getPaginationParams, jsonPaginated, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { createServiceSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// GET /api/partners/services — Any authenticated partner user: list active services
export async function GET(request: NextRequest) {
  const { error } = await requirePartnerAuth();
  if (error) return error;

  const pagination = getPaginationParams(request.nextUrl.searchParams);

  const where = { isActive: true };
  const [data, total] = await Promise.all([
    db.partnerService.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
    }),
    db.partnerService.count({ where }),
  ]);

  return jsonPaginated(data, total, pagination);
}

// POST /api/partners/services — Admin: create service
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const service = await db.partnerService.create({ data: parsed.data });
  return jsonSuccess(service, 201);
}
