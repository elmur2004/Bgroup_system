import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WeeklyCalendarClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CrmMeetingsCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.crmProfileId) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Time × weekday grid of booked meetings. Click a slot to open the meeting; book a new one from the meetings page.
        </p>
      </div>
      <WeeklyCalendarClient />
    </div>
  );
}
