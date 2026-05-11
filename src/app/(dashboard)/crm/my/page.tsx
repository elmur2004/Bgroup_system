import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getMyDashboardData } from "./data";
import { MyDashboardClient } from "@/components/crm/dashboard/MyDashboardClient";

export default async function MyDashboardPage() {
  const session = await getRequiredSession();
  const { locale } = await getServerT();
  const data = await getMyDashboardData(session);

  return (
    <MyDashboardClient
      data={JSON.parse(JSON.stringify(data))}
      locale={locale}
    />
  );
}
