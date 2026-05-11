import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OrgChart } from "@/components/hr/org-chart/OrgChart";

export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const session = await auth();
  if (!session?.user || !session.user.modules?.includes("hr")) {
    redirect("/");
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Org chart</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reporting hierarchy across the company.
        </p>
      </div>
      <OrgChart />
    </div>
  );
}
