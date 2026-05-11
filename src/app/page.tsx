import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const modules = session.user.modules || [];

  // Single module → go directly to that module's default page
  if (modules.length === 1) {
    const mod = modules[0];
    if (mod === "hr") {
      const roles = session.user.hrRoles || [];
      if (roles.includes("super_admin") || roles.includes("hr_manager")) {
        redirect("/hr/dashboard");
      } else if (roles.includes("ceo")) {
        redirect("/hr/management");
      } else if (roles.includes("accountant")) {
        redirect("/hr/accountant");
      } else if (roles.includes("team_lead")) {
        redirect("/hr/team");
      } else {
        redirect("/hr/employee/home");
      }
    }
    if (mod === "crm") redirect("/crm/my");
    if (mod === "partners") redirect("/partners/dashboard");
  }

  // Multi-module → go to first available module
  if (modules.includes("crm")) redirect("/crm/my");
  if (modules.includes("hr")) redirect("/hr/dashboard");
  if (modules.includes("partners")) redirect("/partners/dashboard");

  redirect("/login");
}
