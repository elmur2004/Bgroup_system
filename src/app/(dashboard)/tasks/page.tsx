import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TaskList } from "@/components/tasks/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything assigned to you across HR, CRM, and Partners.
        </p>
      </div>
      <TaskList scope="mine" showBuckets={true} />
    </div>
  );
}
