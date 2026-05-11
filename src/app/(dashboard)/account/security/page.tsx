import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SecurityClient } from "@/components/account/SecurityClient";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaEnabled: true,
      mfaCredentials: { select: { id: true, kind: true, label: true, verified: true, lastUsedAt: true } },
      _count: { select: { recoveryCodes: { where: { used: false } } } },
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage two-factor authentication and recovery codes.
        </p>
      </div>
      <SecurityClient
        initialMfaEnabled={!!user?.mfaEnabled}
        verifiedCredentialCount={
          user?.mfaCredentials.filter((c) => c.verified).length ?? 0
        }
        unusedRecoveryCodes={user?._count.recoveryCodes ?? 0}
      />
    </div>
  );
}
