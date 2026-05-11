import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WorkflowsListClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SequentialWorkflowsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!isAdmin) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sequential workflows</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build n8n-style ordered workflows. Each step assigns a task to a user with a time
          budget — when they mark it done the next step's task is created automatically.
          Late = HR incident. Under 50% of budget = HR bonus.
        </p>
      </div>
      <WorkflowsListClient />
    </div>
  );
}
