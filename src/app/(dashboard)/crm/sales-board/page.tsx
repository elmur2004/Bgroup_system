import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SalesBoardClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CrmSalesBoardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.crmProfileId) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales board</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pipeline KPIs, per-rep performance, service mix, and meeting health — refreshed live from opportunities and meetings.
        </p>
      </div>
      <SalesBoardClient />
    </div>
  );
}
