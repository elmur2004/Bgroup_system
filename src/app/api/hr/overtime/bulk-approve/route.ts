import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";
import { createAuditLog, getClientIp } from "@/lib/hr/audit";
import { z } from "zod";
import { publish } from "@/lib/events/bus";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const authUser = await requireAuth(request);
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: "Permission denied." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { detail: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;
    const now = new Date();

    // Only flip rows that are still pending — avoids accidentally re-approving
    // already-actioned ones if the client list is stale.
    const result = await prisma.hrOvertimeRequest.updateMany({
      where: { id: { in: ids }, status: "pending" },
      data: { status: "approved", approvedById: authUser.id, approvedAt: now },
    });

    await createAuditLog({
      userId: authUser.id,
      action: "bulk_approve",
      entityType: "overtime_request",
      ipAddress: getClientIp(request),
      details: `Bulk-approved ${result.count} of ${ids.length} overtime requests`,
    });

    publish({
      type: "data.invalidate",
      userId: authUser.id,
      payload: { queryKeys: [["overtime", "pending"]] },
    });

    return NextResponse.json({ approved: result.count, requested: ids.length });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("bulk-approve error", error);
    return NextResponse.json({ detail: "Server error." }, { status: 500 });
  }
}
