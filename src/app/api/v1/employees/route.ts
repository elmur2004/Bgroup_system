import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey, requireScope } from "@/lib/api-keys";

/** Public REST API · GET /api/v1/employees · scope: "read:employees" */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!requireScope(auth.scopes, "read:employees")) {
    return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 50));
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const employees = await db.hrEmployee.findMany({
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: {
      id: true,
      employeeId: true,
      fullNameEn: true,
      positionEn: true,
      status: true,
      companyId: true,
      departmentId: true,
    },
    orderBy: { fullNameEn: "asc" },
  });

  const nextCursor = employees.length > limit ? employees.pop()!.id : null;
  return NextResponse.json({ data: employees, nextCursor });
}
