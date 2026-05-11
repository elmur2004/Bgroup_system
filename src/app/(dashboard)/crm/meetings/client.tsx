"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

type Meeting = {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  meetingType: string;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  customerNeed: string | null;
  notes: string | null;
  scheduledBy: { id: string; fullName: string };
  company: { id: string; nameEn: string } | null;
  opportunity: { id: string; code: string; title: string } | null;
};

const TYPES = ["DEMO", "OFFICE_VISIT", "FOLLOWUP", "PROPOSAL", "ONBOARDING"];
const NEEDS = ["B-Clinics", "B-Optical", "Social Media Management", "Website", "ERP System", "Mobile App"];
const DURATIONS = [30, 60, 90, 120];

const STATUS_BADGE: Record<string, string> = {
  WAITING: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CONFIRMED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  DONE: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CANCELLED: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingsClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/meetings?scope=mine");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function patchStatus(id: string, status: string) {
    const res = await fetch(`/api/crm/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success(`Marked ${status.toLowerCase()}`);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this meeting?")) return;
    const res = await fetch(`/api/crm/meetings/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    refresh();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = meetings.filter((m) => new Date(m.startAt) >= today && m.status !== "CANCELLED");
  const past = meetings.filter((m) => new Date(m.startAt) < today || m.status === "DONE");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/crm/meetings/calendar" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5">
          <CalendarIcon className="h-4 w-4" />
          Open weekly calendar
        </Link>
        <Button size="sm" onClick={() => setBookOpen(true)}>
          <Plus className="h-4 w-4 me-1.5" />
          Book meeting
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upcoming ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming meetings.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((m) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  onStatus={(s) => patchStatus(m.id, s)}
                  onDelete={() => remove(m.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Past / done ({past.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y opacity-70">
              {past.slice(0, 20).map((m) => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  onStatus={(s) => patchStatus(m.id, s)}
                  onDelete={() => remove(m.id)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <BookDialog open={bookOpen} onOpenChange={setBookOpen} onCreated={refresh} />
    </div>
  );
}

function MeetingRow({
  meeting,
  onStatus,
  onDelete,
}: {
  meeting: Meeting;
  onStatus: (status: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-mono text-muted-foreground">{meeting.code}</span>
          <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${STATUS_BADGE[meeting.status]}`}>
            {meeting.status}
          </span>
          <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
            {meeting.meetingType.replace("_", " ")}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {meeting.contactName ?? meeting.company?.nameEn ?? "—"}
          {meeting.customerNeed && (
            <span className="ms-2 text-xs text-muted-foreground">· {meeting.customerNeed}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {formatDateTime(meeting.startAt)} · {meeting.durationMinutes}m · {meeting.scheduledBy.fullName}
        </p>
      </div>
      {meeting.status === "WAITING" && (
        <Button size="sm" variant="outline" onClick={() => onStatus("CONFIRMED")}>
          Confirm
        </Button>
      )}
      {(meeting.status === "WAITING" || meeting.status === "CONFIRMED") && (
        <Button size="sm" variant="outline" onClick={() => onStatus("DONE")}>
          Mark done
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
        Delete
      </Button>
    </li>
  );
}

function BookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState<string>("10:00");
  const [duration, setDuration] = useState(30);
  const [meetingType, setMeetingType] = useState("DEMO");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerNeed, setCustomerNeed] = useState("B-Optical");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConflictMsg(null);
      setContactName("");
      setContactPhone("");
      setNotes("");
    }
  }, [open]);

  async function submit() {
    if (!contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    setSaving(true);
    setConflictMsg(null);
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch("/api/crm/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt,
          durationMinutes: duration,
          meetingType,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || null,
          customerNeed,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflictMsg(data.error ?? "Time slot conflict");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Booking failed");
        return;
      }
      toast.success("Meeting booked");
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a technical meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {conflictMsg && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{conflictMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={meetingType} onValueChange={(v) => setMeetingType(v ?? "DEMO")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. د. أحمد محمد" />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+201..." />
          </div>
          <div>
            <Label>Customer need</Label>
            <Select value={customerNeed} onValueChange={(v) => setCustomerNeed(v ?? "B-Optical")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NEEDS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            <CheckCircle2 className="h-4 w-4 me-1.5" />
            {saving ? "Booking..." : "Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
