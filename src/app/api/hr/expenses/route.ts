import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";

const createSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional().default("EGP"),
  date: z.string().datetime(),
  description: z.string().max(1000).optional().default(""),
  receiptUrl: z.string().url().optional(),
});

export async function GET(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const ownEmp = await db.hrEmployee.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });

    const where: {
      status?: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REIMBURSED";
      employeeId?: string;
    } = {};
    if (status) {
      where.status = status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REIMBURSED";
    }
    if (!isHROrAdmin(authUser) && ownEmp) {
      where.employeeId = ownEmp.id;
    }
    const expenses = await db.hrExpense.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
      include: { category: { select: { name: true } } },
    });
    return NextResponse.json({ expenses });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const ownEmp = await db.hrEmployee.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });
    if (!ownEmp) {
      return NextResponse.json({ detail: "No employee profile" }, { status: 400 });
    }
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 });
    }
    const expense = await db.hrExpense.create({
      data: {
        employeeId: ownEmp.id,
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        date: new Date(parsed.data.date),
        description: parsed.data.description,
        receiptUrl: parsed.data.receiptUrl,
        status: "SUBMITTED",
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}
