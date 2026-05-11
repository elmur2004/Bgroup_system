import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/safe-auth";
import { AuditTrailClient } from "@/components/audit/AuditTrailClient";

export const dynamic = "force-dynamic";

export default async function PartnersAuditLogsPage() {
  const session = await safeAuth();
  if (!session?.user) redirect("/login");

  // Platform admin = HR super_admin OR Partners admin (no partnerId).
  const hrSuperAdmin = session.user.hrRoles?.includes("super_admin");
  const partnersAdmin =
    !!session.user.modules?.includes("partners") && !session.user.partnerId;

  if (!hrSuperAdmin && !partnersAdmin) {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all system activity and changes — filter by module, user, action, or date.
        </p>
      </div>
      <AuditTrailClient
        availableModules={[
          ...(hrSuperAdmin ? (["hr"] as const) : []),
          ...(partnersAdmin ? (["partners"] as const) : []),
        ]}
      />
    </div>
  );
}
