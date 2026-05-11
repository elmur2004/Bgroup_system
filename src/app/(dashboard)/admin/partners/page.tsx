// Admin-centric view of partners. Reuses the existing partner-admin page
// component so we don't fork two implementations. Same RBAC: platform admin
// only.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PartnersAdminPage from "../../partners/admin/partners/page";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!isAdmin) redirect("/");
  // Defer to the existing partners admin UI (it already handles CRUD + status
  // toggles). Keeps a single source of truth; we just expose it under /admin.
  return <PartnersAdminPage />;
}
