import { getRequiredSession } from "@/lib/crm/session";
import { getDefaultRoute } from "@/lib/crm/rbac";
import { redirect } from "next/navigation";

export default async function DashboardIndex() {
  const session = await getRequiredSession();
  redirect(getDefaultRoute(session.role));
}
