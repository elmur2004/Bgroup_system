import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminUsersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!isAdmin) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every account in the system — employees, sales reps (employees + CRM profile), partners, and admins.
          Sales reps are real HR employees; their commissions are computed off their CRM deals.
        </p>
      </div>
      <AdminUsersClient />
    </div>
  );
}
