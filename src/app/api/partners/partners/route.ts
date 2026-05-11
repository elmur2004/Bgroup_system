import { db } from "@/lib/db";
import { requireAdmin, getPaginationParams, jsonPaginated, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { createPartnerSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

// GET /api/partners/partners — Admin: list all partners
export async function GET(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const pagination = getPaginationParams(request.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    db.partnerProfile.findMany({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    db.partnerProfile.count(),
  ]);

  return jsonPaginated(data, total, pagination);
}

// POST /api/partners/partners — Admin: create partner
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = createPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { email, password, name, companyName, contactPhone, commissionRate } = parsed.data;

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        partnersAccess: true,
      },
    });

    const partner = await tx.partnerProfile.create({
      data: {
        userId: newUser.id,
        companyName,
        contactPhone,
        commissionRate: commissionRate ?? 10,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return partner;
  });

  return jsonSuccess(result, 201);
}
