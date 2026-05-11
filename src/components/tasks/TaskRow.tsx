"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TaskRow as TaskRowT } from "./types";
import type { TaskPriority } from "@/generated/prisma";
import { entityHref } from "@/lib/tasks/helpers";
import { CalendarClock, ExternalLink } from "lucide-react";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const TYPE_LABEL: Record<string, string> = {
  GENERAL: "Task",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  ADMIN: "Admin",
  ONBOARDING: "Onboarding",
  REVIEW: "Review",
  APPROVAL: "Approval",
};

function formatDue(dueAt: string | null) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);

  let label: string;
  if (dueDay.getTime() === today.getTime()) label = "Today";
  else if (dueDay.getTime() === tomorrow.getTime()) label = "Tomorrow";
  else if (dueDay < today) label = `${Math.ceil((today.getTime() - dueDay.getTime()) / 86400000)}d overdue`;
  else label = due.toLocaleDateString();

  const isOverdue = dueDay < today;
  return { label, isOverdue };
}

export function TaskRow({
  task,
  selected,
  onSelectChange,
  onToggleDone,
  onOpen,
}: {
  task: TaskRowT;
  selected: boolean;
  onSelectChange: (next: boolean) => void;
  onToggleDone: () => void;
  onOpen: () => void;
}) {
  const isDone = task.status === "DONE";
  const dueInfo = formatDue(task.dueAt);
  const linkHref = entityHref(task.entityType, task.entityId);

  return (
    <li
      className={cn(
        "group flex items-start gap-3 px-3 py-2.5 border-b last:border-b-0 transition-colors",
        selected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(v) => onSelectChange(!!v)}
        aria-label="Select task"
        className="mt-1 shrink-0"
      />
      <button
        onClick={onToggleDone}
        className={cn(
          "mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
          isDone
            ? "bg-primary border-primary"
            : "border-muted-foreground/30 hover:border-primary"
        )}
        aria-label={isDone ? "Mark not done" : "Mark done"}
      >
        {isDone && (
          <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium text-foreground truncate",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          <span className={cn("text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0", PRIORITY_STYLES[task.priority])}>
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{TYPE_LABEL[task.type] ?? task.type}</span>
          {dueInfo && (
            <span className={cn("flex items-center gap-1", dueInfo.isOverdue && !isDone && "text-red-600 dark:text-red-400")}>
              <CalendarClock className="h-3 w-3" />
              {dueInfo.label}
            </span>
          )}
          <span className="truncate">{task.assignee.name ?? task.assignee.email}</span>
        </div>
      </button>

      {linkHref && (
        <Link
          href={linkHref}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent shrink-0"
          aria-label="Open related entity"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      )}
    </li>
  );
}
