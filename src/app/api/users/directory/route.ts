import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Lightweight user directory used by the task drawer's assignee picker.
 * Returns id / name / email for every authenticated user — fan-out is fine
 * for current org sizes; can be paginated later if needed.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  return NextResponse.json({ users });
}
