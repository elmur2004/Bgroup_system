import { getRequiredSession } from "@/lib/crm/session";
import { getServerT } from "@/lib/i18n/server";
import { getGroupDashboardData } from "./data";
import { GroupDashboardClient } from "@/components/crm/dashboard/GroupDashboardClient";
import { db } from "@/lib/db";

export default async function GroupDashboardPage() {
  const session = await getRequiredSession();
  const { locale } = await getServerT();

  const [data, entities] = await Promise.all([
    getGroupDashboardData(session),
    db.crmEntity.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <GroupDashboardClient
      data={JSON.parse(JSON.stringify(data))}
      entities={JSON.parse(JSON.stringify(entities))}
      locale={locale}
    />
  );
}
