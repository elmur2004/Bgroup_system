import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TeamCalendar } from "@/components/hr/calendar/TeamCalendar";

export const dynamic = "force-dynamic";

export default async function TimeOffCalendarPage() {
  const session = await auth();
  if (!session?.user || !session.user.modules?.includes("hr")) {
    redirect("/");
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Time-off calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Who's out and when, with conflict detection per department.
        </p>
      </div>
      <TeamCalendar />
    </div>
  );
}
