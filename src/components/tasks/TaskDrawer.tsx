"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Repeat, MessageSquare, ListTree, Send, Eye, EyeOff, Play, Square, Clock, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskType } from "@/generated/prisma";
import type { TaskRow } from "./types";

const PRIORITY: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TaskType[] = [
  "GENERAL",
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "ADMIN",
  "ONBOARDING",
  "REVIEW",
  "APPROVAL",
];

type AfterCompleteRecurrence = { kind: "after_complete"; intervalDays: number; until?: string };
type FixedScheduleRecurrence = { kind: "fixed_schedule"; every: "daily" | "weekly" | "monthly"; atHour?: number; until?: string };
type RecurrenceConfig = AfterCompleteRecurrence | FixedScheduleRecurrence;

type FullTask = TaskRow & {
  recurrence?: RecurrenceConfig | null;
  recurrenceTemplateId?: string | null;
  children?: Array<{ id: string; title: string; status: string; assignee?: { id: string; name: string | null } }>;
};

type Comment = {
  id: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
};

type Member = { id: string; name: string | null; email: string };

type Watcher = {
  id: string;
  user: { id: string; name: string | null; email: string; image?: string | null };
};

type TimeEntry = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  note: string;
  user: { id: string; name: string | null; email: string };
};

type DependencyLink = {
  id: string;
  blockedBy?: { id: string; title: string; status: string; dueAt: string | null };
  task?: { id: string; title: string; status: string; dueAt: string | null };
};

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TaskDrawer({
  taskId,
  open,
  onOpenChange,
  onChanged,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const [task, setTask] = useState<FullTask | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [blockedBy, setBlockedBy] = useState<DependencyLink[]>([]);
  const [blocks, setBlocks] = useState<DependencyLink[]>([]);
  const [depPickerQuery, setDepPickerQuery] = useState("");
  const [depResults, setDepResults] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<"after_complete" | "fixed_schedule">("after_complete");
  const [recurrenceDays, setRecurrenceDays] = useState(7);
  const [recurrenceEvery, setRecurrenceEvery] = useState<"daily" | "weekly" | "monthly">("weekly");

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, commentsRes, watchersRes, sessionRes, timeRes, depRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch(`/api/tasks/${taskId}/comments`),
        fetch(`/api/tasks/${taskId}/watchers`),
        fetch(`/api/auth/session`),
        fetch(`/api/tasks/${taskId}/time-entries`),
        fetch(`/api/tasks/${taskId}/dependencies`),
      ]);
      if (taskRes.ok) {
        const data = await taskRes.json();
        setTask(data.task);
        const rec = data.task?.recurrence as RecurrenceConfig | null | undefined;
        setRecurrenceEnabled(!!rec);
        if (rec?.kind === "after_complete") {
          setRecurrenceMode("after_complete");
          setRecurrenceDays(rec.intervalDays ?? 7);
        } else if (rec?.kind === "fixed_schedule") {
          setRecurrenceMode("fixed_schedule");
          setRecurrenceEvery(rec.every ?? "weekly");
        }
      }
      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data.comments ?? []);
      }
      if (watchersRes.ok) {
        const data = await watchersRes.json();
        setWatchers(data.watchers ?? []);
      }
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setMe(data?.user?.id ?? null);
      }
      if (timeRes.ok) {
        const data = await timeRes.json();
        setTimeEntries(data.entries ?? []);
        setTotalMinutes(data.totalMinutes ?? 0);
        setRunningEntry(data.running ?? null);
      }
      if (depRes.ok) {
        const data = await depRes.json();
        setBlockedBy(data.blockedBy ?? []);
        setBlocks(data.blocks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
      // Lazy fetch the directory of users we can reassign to.
      fetch("/api/users/directory?limit=200")
        .then((r) => (r.ok ? r.json() : { users: [] }))
        .then((d) => setMembers(d.users ?? []))
        .catch(() => setMembers([]));
    } else if (!open) {
      setTask(null);
      setComments([]);
      setWatchers([]);
      setTimeEntries([]);
      setTotalMinutes(0);
      setRunningEntry(null);
      setBlockedBy([]);
      setBlocks([]);
      setNewComment("");
      setNewSubtaskTitle("");
    }
  }, [open, taskId, fetchTask]);

  // Search for tasks to add as a blocker (dependency picker).
  useEffect(() => {
    const q = depPickerQuery.trim();
    if (!q) {
      setDepResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/tasks?scope=mine&q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setDepResults((data.tasks ?? []).map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [depPickerQuery]);

  async function startTimer() {
    if (!task) return;
    setSavingField("timer");
    try {
      const res = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) {
        toast.error("Failed to start timer");
        return;
      }
      fetchTask();
    } finally {
      setSavingField(null);
    }
  }

  async function stopTimer() {
    if (!task) return;
    setSavingField("timer");
    try {
      const res = await fetch(`/api/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      if (!res.ok) {
        toast.error("Failed to stop timer");
        return;
      }
      fetchTask();
    } finally {
      setSavingField(null);
    }
  }

  async function deleteTimeEntry(entryId: string) {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/time-entries?entryId=${entryId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete entry");
      return;
    }
    fetchTask();
  }

  async function addBlocker(blockerId: string) {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedById: blockerId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to add dependency");
      return;
    }
    setDepPickerQuery("");
    setDepResults([]);
    fetchTask();
  }

  async function removeBlocker(blockerId: string) {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/dependencies?blockedById=${blockerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove dependency");
      return;
    }
    fetchTask();
  }

  const isWatching = me ? watchers.some((w) => w.user.id === me) : false;

  async function toggleWatch() {
    if (!task || !me) return;
    setSavingField("watch");
    try {
      if (isWatching) {
        const res = await fetch(`/api/tasks/${task.id}/watchers?userId=${me}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to unwatch");
          return;
        }
        setWatchers((prev) => prev.filter((w) => w.user.id !== me));
      } else {
        const res = await fetch(`/api/tasks/${task.id}/watchers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: me }),
        });
        if (!res.ok) {
          toast.error("Failed to watch");
          return;
        }
        const data = await res.json();
        if (data.watcher) setWatchers((prev) => [...prev, data.watcher]);
      }
    } finally {
      setSavingField(null);
    }
  }

  async function patch(payload: Record<string, unknown>, fieldName: string) {
    if (!task) return;
    setSavingField(fieldName);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Save failed");
        return;
      }
      const data = await res.json();
      setTask((prev) => (prev ? { ...prev, ...data.task } : prev));
      onChanged?.();
    } finally {
      setSavingField(null);
    }
  }

  async function postComment() {
    if (!task || !newComment.trim()) return;
    setSavingField("comment");
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to post comment");
        return;
      }
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } finally {
      setSavingField(null);
    }
  }

  async function deleteComment(id: string) {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete comment");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  async function addSubtask() {
    if (!task || !newSubtaskTitle.trim()) return;
    setSavingField("subtask");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parentId: task.id,
          assigneeId: task.assigneeId,
          module: task.module,
          entityType: task.entityType,
          entityId: task.entityId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to add subtask");
        return;
      }
      setNewSubtaskTitle("");
      fetchTask();
      onChanged?.();
    } finally {
      setSavingField(null);
    }
  }

  async function toggleSubtask(subtaskId: string, status: string) {
    const next = status === "DONE" ? "TODO" : "DONE";
    const res = await fetch(`/api/tasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      toast.error("Failed to toggle subtask");
      return;
    }
    fetchTask();
    onChanged?.();
  }

  async function deleteSubtask(subtaskId: string) {
    const res = await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete subtask");
      return;
    }
    fetchTask();
    onChanged?.();
  }

  async function saveRecurrence() {
    if (!task) return;
    if (!recurrenceEnabled) {
      await patch({ recurrence: null }, "recurrence");
      toast.success("Recurrence cleared");
      return;
    }
    if (recurrenceMode === "after_complete") {
      await patch(
        { recurrence: { kind: "after_complete", intervalDays: recurrenceDays } },
        "recurrence"
      );
    } else {
      await patch(
        { recurrence: { kind: "fixed_schedule", every: recurrenceEvery, atHour: 9 } },
        "recurrence"
      );
    }
    toast.success("Recurrence enabled");
  }

  const childrenDoneCount = task?.children?.filter((c) => c.status === "DONE").length ?? 0;
  const childrenTotal = task?.children?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-base font-semibold truncate">
            {task?.title ?? "Task"}
          </SheetTitle>
          {task && me && task.createdById !== me && (
            <p className="text-xs text-muted-foreground">
              Assigned by {task.createdBy?.name ?? task.createdBy?.email ?? "someone above you"} —
              you can Start, End, add comments and attach files. Edit is restricted to the creator.
            </p>
          )}
        </SheetHeader>

        {loading || !task ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            Loading...
          </div>
        ) : (() => {
          // Permission lattice for this drawer. Matches the server-side rule
          // in /api/tasks/[id]/route.ts so the UI never offers a control the
          // backend would 403. `canEdit` ⇒ everything (title, due date, ...);
          // `canAct` ⇒ just status (Start/End) + comments + attachments.
          const isCreator = !!me && task.createdById === me;
          const isAssignee = !!me && task.assigneeId === me;
          const canEdit = isCreator;
          const canAct = isCreator || isAssignee;
          return (
          <div className="p-6 space-y-6">
            {/* Start / End action band — always visible to the assignee (and
                creator); the only controls a non-creator gets to operate. */}
            {canAct && task.status !== "DONE" && task.status !== "CANCELLED" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs text-muted-foreground me-auto">
                  {task.status === "TODO" ? "Ready to begin?" : "Working on it?"}
                </span>
                {task.status === "TODO" && (
                  <Button
                    size="sm"
                    onClick={() => patch({ status: "IN_PROGRESS" }, "status")}
                    disabled={savingField === "status"}
                  >
                    <Play className="h-4 w-4 me-1" /> Start
                  </Button>
                )}
                {task.status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    onClick={() => patch({ status: "DONE" }, "status")}
                    disabled={savingField === "status"}
                  >
                    <Square className="h-4 w-4 me-1" /> End (mark done)
                  </Button>
                )}
              </div>
            )}

            {/* Title + description */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="td-title" className="text-xs">Title</Label>
                <Input
                  id="td-title"
                  defaultValue={task.title}
                  readOnly={!canEdit}
                  onBlur={(e) => {
                    if (!canEdit) return;
                    const v = e.target.value.trim();
                    if (v && v !== task.title) patch({ title: v }, "title");
                  }}
                  disabled={savingField === "title"}
                  title={canEdit ? undefined : "Only the task creator can edit this field"}
                />
              </div>
              <div>
                <Label htmlFor="td-desc" className="text-xs">Description</Label>
                <Textarea
                  id="td-desc"
                  rows={3}
                  defaultValue={task.description}
                  readOnly={!canEdit}
                  onBlur={(e) => {
                    if (!canEdit) return;
                    const v = e.target.value;
                    if (v !== task.description) patch({ description: v }, "description");
                  }}
                  disabled={savingField === "description"}
                  title={canEdit ? undefined : "Only the task creator can edit this field"}
                />
              </div>
            </div>

            {/* Meta grid — assignees can flip status (Start/End) via the action
                band above; the rest of these fields are creator-only. The
                Status select is still rendered so an assignee can see the
                current value, but disabled when they can't change it. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(v) => patch({ status: v }, "status")}
                  disabled={savingField === "status" || (!canEdit && !canAct)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(canEdit
                      ? (["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const)
                      : (["TODO", "IN_PROGRESS", "DONE"] as const)
                    ).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={task.priority}
                  onValueChange={(v) => patch({ priority: v }, "priority")}
                  disabled={savingField === "priority" || !canEdit}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={task.type}
                  onValueChange={(v) => patch({ type: v }, "type")}
                  disabled={savingField === "type" || !canEdit}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Due date</Label>
                <Input
                  type="date"
                  defaultValue={task.dueAt ? task.dueAt.split("T")[0] : ""}
                  readOnly={!canEdit}
                  onBlur={(e) => {
                    if (!canEdit) return;
                    const v = e.target.value;
                    const newIso = v ? new Date(`${v}T17:00:00`).toISOString() : null;
                    if (newIso !== task.dueAt) patch({ dueAt: newIso }, "dueAt");
                  }}
                  title={canEdit ? undefined : "Only the task creator can edit this field"}
                />
              </div>
            </div>

            {/* Watch toggle */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {watchers.length === 0
                  ? "No watchers"
                  : `${watchers.length} watcher${watchers.length === 1 ? "" : "s"}`}
                {watchers.length > 0 && (
                  <span className="ms-2 text-xs">
                    ({watchers.slice(0, 3).map((w) => w.user.name ?? w.user.email).join(", ")}
                    {watchers.length > 3 ? ", ..." : ""})
                  </span>
                )}
              </div>
              <Button
                variant={isWatching ? "default" : "outline"}
                size="sm"
                onClick={toggleWatch}
                disabled={savingField === "watch"}
              >
                {isWatching ? (
                  <><EyeOff className="h-3.5 w-3.5 me-1.5" />Unwatch</>
                ) : (
                  <><Eye className="h-3.5 w-3.5 me-1.5" />Watch</>
                )}
              </Button>
            </div>

            {/* Delegation */}
            <div>
              <Label className="text-xs flex items-center gap-1.5">Assignee</Label>
              <Select
                value={task.assigneeId}
                onValueChange={(v) => {
                  if (!canEdit) return;
                  if (v !== task.assigneeId) {
                    const note = window.prompt("Optional delegation note:");
                    patch(
                      { assigneeId: v, ...(note ? { delegationNote: note } : {}) },
                      "assignee"
                    );
                  }
                }}
                disabled={savingField === "assignee" || !canEdit}
              >
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {members.length === 0 ? (
                    <SelectItem value={task.assigneeId}>
                      {task.assignee.name ?? task.assignee.email}
                    </SelectItem>
                  ) : (
                    members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Recurrence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5" />
                  Recurrence
                </Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={recurrenceEnabled}
                    onCheckedChange={(v) => setRecurrenceEnabled(!!v)}
                  />
                  <Select
                    value={recurrenceMode}
                    onValueChange={(v) => setRecurrenceMode(v as "after_complete" | "fixed_schedule")}
                    disabled={!recurrenceEnabled}
                  >
                    <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after_complete">After completion</SelectItem>
                      <SelectItem value="fixed_schedule">Fixed schedule</SelectItem>
                    </SelectContent>
                  </Select>
                  {recurrenceMode === "after_complete" ? (
                    <>
                      <Input
                        type="number"
                        className="w-16 h-8"
                        min={1}
                        max={365}
                        value={recurrenceDays}
                        onChange={(e) => setRecurrenceDays(Number(e.target.value) || 7)}
                        disabled={!recurrenceEnabled}
                      />
                      <span className="text-sm text-muted-foreground">days later</span>
                    </>
                  ) : (
                    <Select
                      value={recurrenceEvery}
                      onValueChange={(v) => setRecurrenceEvery(v as "daily" | "weekly" | "monthly")}
                      disabled={!recurrenceEnabled}
                    >
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveRecurrence}
                    disabled={savingField === "recurrence"}
                    className="ms-auto"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {recurrenceMode === "after_complete"
                    ? "Spawns the next instance N days after this one is marked done."
                    : "Spawns a new instance on the chosen cadence regardless of completion (driven by the cron worker)."}
                </p>
              </div>
            </div>

            <Separator />

            {/* Time tracking */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time tracking
                  {totalMinutes > 0 && (
                    <span className="ms-1 text-xs text-muted-foreground">
                      (total {formatDuration(totalMinutes)})
                    </span>
                  )}
                </Label>
                {runningEntry ? (
                  <Button size="sm" variant="default" onClick={stopTimer} disabled={savingField === "timer"}>
                    <Square className="h-3.5 w-3.5 me-1.5" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={startTimer} disabled={savingField === "timer"}>
                    <Play className="h-3.5 w-3.5 me-1.5" />
                    Start
                  </Button>
                )}
              </div>
              {runningEntry && me === runningEntry.user.id && (
                <p className="text-xs text-muted-foreground mb-2">
                  Timer running since {new Date(runningEntry.startedAt).toLocaleTimeString()}
                </p>
              )}
              <ul className="space-y-1.5 text-sm">
                {timeEntries.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center justify-between group">
                    <span className="text-foreground">
                      {e.user.name ?? e.user.email}
                      <span className="text-muted-foreground ms-2">
                        {e.endedAt
                          ? `${formatDuration(e.durationMinutes ?? 0)} · ${new Date(e.startedAt).toLocaleDateString()}`
                          : "(running)"}
                      </span>
                    </span>
                    {e.endedAt && (e.user.id === me) && (
                      <button
                        onClick={() => deleteTimeEntry(e.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
                {timeEntries.length === 0 && (
                  <li className="text-xs text-muted-foreground">No time logged yet.</li>
                )}
              </ul>
            </div>

            <Separator />

            {/* Dependencies */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-3">
                <Link2 className="h-3.5 w-3.5" />
                Dependencies
              </Label>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Blocked by</p>
                  {blockedBy.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Not blocked.</p>
                  ) : (
                    <ul className="space-y-1">
                      {blockedBy.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-sm group">
                          <span className={cn(
                            "inline-block h-1.5 w-1.5 rounded-full shrink-0",
                            d.blockedBy?.status === "DONE" ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className={cn(
                            "flex-1 truncate",
                            d.blockedBy?.status === "DONE" && "line-through text-muted-foreground"
                          )}>
                            {d.blockedBy?.title}
                          </span>
                          <button
                            onClick={() => d.blockedBy && removeBlocker(d.blockedBy.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                            aria-label="Remove blocker"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 relative">
                    <Input
                      placeholder="Add a blocking task..."
                      value={depPickerQuery}
                      onChange={(e) => setDepPickerQuery(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {depResults.length > 0 && (
                      <ul className="absolute z-10 mt-1 left-0 right-0 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {depResults
                          .filter((r) => r.id !== task.id && !blockedBy.some((b) => b.blockedBy?.id === r.id))
                          .map((r) => (
                            <li key={r.id}>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                                onClick={() => addBlocker(r.id)}
                              >
                                {r.title}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </div>

                {blocks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Blocks</p>
                    <ul className="space-y-1">
                      {blocks.map((d) => (
                        <li key={d.id} className="flex items-center gap-2 text-sm">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="flex-1 truncate">{d.task?.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <ListTree className="h-3.5 w-3.5" />
                  Subtasks
                  {childrenTotal > 0 && (
                    <span className="ms-1 text-xs text-muted-foreground">
                      ({childrenDoneCount}/{childrenTotal})
                    </span>
                  )}
                </Label>
              </div>
              <ul className="space-y-1.5 mb-3">
                {(task.children ?? []).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 group text-sm">
                    <Checkbox
                      checked={c.status === "DONE"}
                      onCheckedChange={() => toggleSubtask(c.id, c.status)}
                    />
                    <span className={c.status === "DONE" ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                      {c.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                      aria-label="Delete subtask"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask..."
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                />
                <Button
                  size="sm"
                  onClick={addSubtask}
                  disabled={!newSubtaskTitle.trim() || savingField === "subtask"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-3">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
                {comments.length > 0 && (
                  <span className="ms-1 text-xs text-muted-foreground">({comments.length})</span>
                )}
              </Label>
              <ul className="space-y-3 mb-3">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className={c.isSystem
                      ? "text-xs text-muted-foreground italic px-3 py-1.5 bg-muted/50 rounded"
                      : "group"}
                  >
                    {c.isSystem ? (
                      c.body
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {c.author.name ?? c.author.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                          <button
                            onClick={() => deleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 ms-auto"
                            aria-label="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment... (use @name or @email to mention)"
                />
                <Button
                  size="sm"
                  onClick={postComment}
                  disabled={!newComment.trim() || savingField === "comment"}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mentioned users are auto-added as watchers and notified.
              </p>
            </div>

            <Separator />

            {/* Attachments — anyone with task access can upload. Files
                persist for the task lifetime so downstream workflow steps
                see the artifacts upstream produced. */}
            <TaskAttachments taskId={task.id} />

            <Separator />

            {/* Footer actions — Delete is creator-only (server enforces too). */}
            {canEdit && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("Delete this task?")) return;
                    const r = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
                    if (!r.ok) {
                      const data = await r.json().catch(() => ({}));
                      toast.error(data.error ?? "Delete failed");
                      return;
                    }
                    toast.success("Task deleted");
                    onChanged?.();
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 me-1.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Attachments panel for a task — list + upload (creator/assignee/watcher
 * all welcome). The API enforces task access; this UI just hides the
 * upload button if the file payload is too big.
 */
function TaskAttachments({ taskId }: { taskId: string }) {
  type Attachment = {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    createdAt: string;
    uploadedBy: { id: string; name: string | null; email: string };
  };
  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const refresh = useCallback(async () => {
    const r = await fetch(`/api/tasks/${taskId}/attachments`);
    if (r.ok) {
      const d = await r.json();
      setItems(d.attachments ?? []);
    }
  }, [taskId]);
  useEffect(() => { refresh(); }, [refresh]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-picking the same file works
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25 MB cap");
      return;
    }
    setUploading(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // strip data URL prefix
          resolve(result.includes(",") ? result.split(",", 2)[1] : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const r = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          contentBase64,
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        toast.error(data.error ?? "Upload failed");
        return;
      }
      toast.success(`Attached ${file.name}`);
      await refresh();
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Attachments ({items.length})
        </Label>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={onPick} disabled={uploading} />
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 h-8 text-xs hover:bg-muted/50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Attach file"}
          </span>
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No files attached yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted/30 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{a.filename}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {a.uploadedBy.name ?? a.uploadedBy.email} · {formatSize(a.sizeBytes)} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                {a.mimeType.split("/")[1] ?? a.mimeType}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
