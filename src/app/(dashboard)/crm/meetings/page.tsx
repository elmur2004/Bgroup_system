import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MeetingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CrmMeetingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.crmProfileId) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Technical meetings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Book demos, office visits, and follow-up meetings. The system blocks double-bookings on the same slot for the same rep.
        </p>
      </div>
      <MeetingsClient />
    </div>
  );
}
