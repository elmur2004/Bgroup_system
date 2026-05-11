import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuditTrailClient } from "@/components/audit/AuditTrailClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const hrSuperAdmin = session.user.hrRoles?.includes("super_admin");
  const partnersAdmin =
    session.user.modules?.includes("partners") && !session.user.partnerId;

  if (!hrSuperAdmin && !partnersAdmin) {
    redirect("/");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-module activity trail for compliance and forensics.
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
