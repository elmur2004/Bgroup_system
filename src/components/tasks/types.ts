import type { TaskStatus, TaskPriority, TaskType, TaskEntityType } from "@/generated/prisma";

export type TaskAssignee = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export type TaskRow = {
  id: string;
  module: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  createdById: string;
  entityType: TaskEntityType | null;
  entityId: string | null;
  dueAt: string | null;
  remindAt: string | null;
  completedAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: TaskAssignee;
  createdBy: { id: string; name: string | null; email: string };
};

export type TaskBucket = "today" | "overdue" | "upcoming" | "someday" | "done";
