import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";

export const dynamic = "force-dynamic";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!isAdmin) redirect("/");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Edit sequential workflow</h1>
      <WorkflowBuilder workflowId={id} />
    </div>
  );
}
