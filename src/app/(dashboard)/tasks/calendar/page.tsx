import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";

export const dynamic = "force-dynamic";

export default async function TasksCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tasks calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Month view of tasks by due date — click a day to drill in, click a task to edit.
        </p>
      </div>
      <TaskCalendar />
    </div>
  );
}
