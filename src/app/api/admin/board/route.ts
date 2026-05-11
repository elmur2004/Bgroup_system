import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { getBoardData, type Period } from "@/lib/admin/board-aggregator";

function isPlatformAdmin(session: Session) {
  return (
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId)
  );
}

export async function GET(req: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatformAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const periodParam = url.searchParams.get("period") ?? "weekly";
  const period: Period =
    periodParam === "daily" || periodParam === "weekly" || periodParam === "monthly"
      ? (periodParam as Period)
      : "weekly";

  const data = await getBoardData(period);
  return NextResponse.json(data);
}
