"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { TaskPriority, TaskType, TaskEntityType } from "@/generated/prisma";
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

export function TaskForm({
  open,
  onOpenChange,
  initial,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TaskRow;
  defaults?: {
    entityType?: TaskEntityType;
    entityId?: string;
    module?: string;
    assigneeId?: string;
  };
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("GENERAL");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setType(initial?.type ?? "GENERAL");
      setPriority(initial?.priority ?? "MEDIUM");
      setDueDate(initial?.dueAt ? initial.dueAt.split("T")[0] : "");
      setSubmitting(false);
    }
  }, [open, initial]);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        dueAt: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
      };
      if (!initial && defaults?.entityType) payload.entityType = defaults.entityType;
      if (!initial && defaults?.entityId) payload.entityId = defaults.entityId;
      if (!initial && defaults?.module) payload.module = defaults.module;
      if (!initial && defaults?.assigneeId) payload.assigneeId = defaults.assigneeId;

      const res = await fetch(initial ? `/api/tasks/${initial.id}` : "/api/tasks", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save task");
        setSubmitting(false);
        return;
      }
      toast.success(initial ? "Task updated" : "Task created");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save task");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="dueAt">Due date</Label>
            <Input
              id="dueAt"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : initial ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
