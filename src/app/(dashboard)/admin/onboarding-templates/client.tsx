"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id?: string;
  position?: number;
  title: string;
  description?: string;
  taskType?: string;
  priority?: string;
  dueInDays: number;
};

type Template = {
  id: string;
  name: string;
  description: string;
  scope: string;
  isActive: boolean;
  isDefault: boolean;
  items: Item[];
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES = ["GENERAL", "CALL", "EMAIL", "MEETING", "FOLLOW_UP", "ADMIN", "ONBOARDING", "REVIEW", "APPROVAL"];

export function OnboardingTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/onboarding-templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function createBlank() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/onboarding-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Template ${new Date().toISOString().slice(0, 16)}`,
          items: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success("Template created");
      await refresh();
      setOpenId(data.template.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={createBlank} disabled={creating}>
          <Plus className="h-4 w-4 me-1.5" />
          New template
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No templates yet. Create one to customise the onboarding flow.
        </p>
      ) : (
        templates.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            open={openId === t.id}
            onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            onChanged={refresh}
          />
        ))
      )}
    </div>
  );
}

function TemplateRow({
  template,
  open,
  onToggle,
  onChanged,
}: {
  template: Template;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Template>(template);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(template), [template]);

  function patch(patch: Partial<Template>) {
    setDraft({ ...draft, ...patch });
  }
  function setItem(idx: number, patch: Partial<Item>) {
    const items = [...draft.items];
    items[idx] = { ...items[idx], ...patch };
    setDraft({ ...draft, items });
  }
  function addItem() {
    setDraft({ ...draft, items: [...draft.items, { title: "", dueInDays: 0 }] });
  }
  function removeItem(idx: number) {
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/onboarding-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          scope: draft.scope,
          isActive: draft.isActive,
          isDefault: draft.isDefault,
          items: draft.items.map((it, idx) => ({
            position: idx,
            title: it.title,
            description: it.description ?? "",
            taskType: it.taskType ?? "GENERAL",
            priority: it.priority ?? "MEDIUM",
            dueInDays: it.dueInDays,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success("Saved");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    const res = await fetch(`/api/admin/onboarding-templates/${template.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    onChanged();
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between py-3"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <CardTitle className="text-base">{template.name}</CardTitle>
          {template.isDefault && (
            <span className="ms-2 inline-flex items-center gap-1 text-[10px] uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5">
              <Star className="h-3 w-3" />
              Default
            </span>
          )}
          {!template.isActive && (
            <span className="ms-2 text-[10px] uppercase bg-muted rounded px-1.5 py-0.5">
              Inactive
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{template.items.length} steps</span>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs">Name</label>
              <Input value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs">Scope (e.g. engineering, sales)</label>
              <Input value={draft.scope} onChange={(e) => patch({ scope: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs">Description</label>
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={draft.isActive} onCheckedChange={(v) => patch({ isActive: !!v })} />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={draft.isDefault} onCheckedChange={(v) => patch({ isDefault: !!v })} />
              <span className="text-sm">Use as default</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Checklist items</h4>
            <ul className="space-y-2">
              {draft.items.map((it, idx) => (
                <li key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    className="col-span-5"
                    placeholder="Title"
                    value={it.title}
                    onChange={(e) => setItem(idx, { title: e.target.value })}
                  />
                  <Select
                    value={it.taskType ?? "GENERAL"}
                    onValueChange={(v) => setItem(idx, { taskType: v ?? "GENERAL" })}
                  >
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={it.priority ?? "MEDIUM"}
                    onValueChange={(v) => setItem(idx, { priority: v ?? "MEDIUM" })}
                  >
                    <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="col-span-2"
                    placeholder="Days"
                    value={it.dueInDays}
                    onChange={(e) => setItem(idx, { dueInDays: Number(e.target.value) || 0 })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => removeItem(idx)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="mt-3" onClick={addItem}>
              <Plus className="h-4 w-4 me-1.5" />
              Add item
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={remove}>
              <Trash2 className="h-4 w-4 me-1.5" />
              Delete
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
