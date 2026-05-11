import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BoardClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!isAdmin) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Group board</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-module dashboard for the group board — pipeline, people, partners, and
          execution health across daily, weekly, and monthly horizons.
        </p>
      </div>
      <BoardClient />
    </div>
  );
}
