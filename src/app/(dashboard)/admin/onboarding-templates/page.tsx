import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OnboardingTemplatesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function OnboardingTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isHrAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    !!session.user.hrRoles?.includes("hr_manager");
  if (!isHrAdmin) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Onboarding templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define checklists used when HR generates onboarding tasks for new hires.
          Mark one as <em>default</em> to use it whenever no template is specified.
        </p>
      </div>
      <OnboardingTemplatesClient />
    </div>
  );
}
