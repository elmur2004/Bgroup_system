"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, Users, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  reportDate: string;
  callsCount: number;
  meetingsBooked: number;
  meetingsHeld: number;
  newLeads: number;
  notes: string;
  rep: { id: string; fullName: string };
};

type Totals = {
  callsCount: number;
  meetingsBooked: number;
  meetingsHeld: number;
  newLeads: number;
};

type WindowMode = "this-week" | "this-month" | "last-30" | "ytd";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function windowDates(mode: WindowMode): { from: string; to: string; label: string } {
  const today = new Date();
  const to = ymd(today);
  const from = new Date(today);
  if (mode === "this-week") {
    from.setDate(from.getDate() - from.getDay());
    return { from: ymd(from), to, label: "This week" };
  }
  if (mode === "this-month") {
    from.setDate(1);
    return { from: ymd(from), to, label: "This month" };
  }
  if (mode === "last-30") {
    from.setDate(from.getDate() - 30);
    return { from: ymd(from), to, label: "Last 30 days" };
  }
  // ytd
  from.setMonth(0, 1);
  return { from: ymd(from), to, label: "Year to date" };
}

export function DailyReportsClient({ isManager }: { isManager: boolean }) {
  const [windowMode, setWindowMode] = useState<WindowMode>("this-week");
  const [scope, setScope] = useState<"mine" | "all">(isManager ? "all" : "mine");
  const [reports, setReports] = useState<Report[]>([]);
  const [totals, setTotals] = useState<Totals>({ callsCount: 0, meetingsBooked: 0, meetingsHeld: 0, newLeads: 0 });
  const [loading, setLoading] = useState(true);

  // Today's submission form
  const today = ymd(new Date());
  const [callsCount, setCallsCount] = useState(0);
  const [meetingsBooked, setMeetingsBooked] = useState(0);
  const [meetingsHeld, setMeetingsHeld] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    const w = windowDates(windowMode);
    const params = new URLSearchParams({ from: w.from, to: w.to, scope });
    try {
      const res = await fetch(`/api/crm/daily-reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
        setTotals(data.totals ?? { callsCount: 0, meetingsBooked: 0, meetingsHeld: 0, newLeads: 0 });
        // Pre-fill today's form from the current report if any.
        const todays = (data.reports as Report[]).find((r) => r.reportDate.startsWith(today));
        if (todays) {
          setCallsCount(todays.callsCount);
          setMeetingsBooked(todays.meetingsBooked);
          setMeetingsHeld(todays.meetingsHeld);
          setNewLeads(todays.newLeads);
          setNotes(todays.notes);
        }
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowMode, scope]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: today,
          callsCount,
          meetingsBooked,
          meetingsHeld,
          newLeads,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Save failed");
        return;
      }
      toast.success("Report saved");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  const win = windowDates(windowMode);

  return (
    <div className="space-y-4">
      {/* Today's submit panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Today&apos;s activity — {today}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Calls made</Label>
              <Input type="number" min={0} value={callsCount} onChange={(e) => setCallsCount(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Meetings booked</Label>
              <Input type="number" min={0} value={meetingsBooked} onChange={(e) => setMeetingsBooked(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Meetings held</Label>
              <Input type="number" min={0} value={meetingsHeld} onChange={(e) => setMeetingsHeld(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>New leads</Label>
              <Input type="number" min={0} value={newLeads} onChange={(e) => setNewLeads(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>
              <Save className="h-4 w-4 me-1.5" />
              {saving ? "Saving..." : "Save report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={windowMode} onValueChange={(v) => setWindowMode(v as WindowMode)}>
          <TabsList>
            <TabsTrigger value="this-week">This week</TabsTrigger>
            <TabsTrigger value="this-month">This month</TabsTrigger>
            <TabsTrigger value="last-30">Last 30 days</TabsTrigger>
            <TabsTrigger value="ytd">Year to date</TabsTrigger>
          </TabsList>
        </Tabs>
        {isManager && (
          <Tabs value={scope} onValueChange={(v) => setScope(v as "mine" | "all")}>
            <TabsList>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="all">All reps</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Totals tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Total label="Calls made" value={totals.callsCount} icon={Phone} tile="tile-indigo" />
        <Total label="Meetings booked" value={totals.meetingsBooked} icon={Calendar} tile="tile-violet" />
        <Total label="Meetings held" value={totals.meetingsHeld} icon={Calendar} tile="tile-emerald" />
        <Total label="New leads" value={totals.newLeads} icon={Users} tile="tile-amber" />
      </div>

      {/* Rows */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {win.label} — {reports.length} report{reports.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No reports in this window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-start py-2 px-2 text-xs font-medium uppercase">Date</th>
                    {isManager && <th className="text-start py-2 px-2 text-xs font-medium uppercase">Rep</th>}
                    <th className="text-end py-2 px-2 text-xs font-medium uppercase">Calls</th>
                    <th className="text-end py-2 px-2 text-xs font-medium uppercase">Booked</th>
                    <th className="text-end py-2 px-2 text-xs font-medium uppercase">Held</th>
                    <th className="text-end py-2 px-2 text-xs font-medium uppercase">Leads</th>
                    <th className="text-start py-2 px-2 text-xs font-medium uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-2 ltr-nums">{r.reportDate.split("T")[0]}</td>
                      {isManager && <td className="py-2 px-2">{r.rep.fullName}</td>}
                      <td className="py-2 px-2 text-end ltr-nums">{r.callsCount}</td>
                      <td className="py-2 px-2 text-end ltr-nums">{r.meetingsBooked}</td>
                      <td className="py-2 px-2 text-end ltr-nums">{r.meetingsHeld}</td>
                      <td className="py-2 px-2 text-end ltr-nums">{r.newLeads}</td>
                      <td className="py-2 px-2 text-muted-foreground truncate max-w-xs">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Total({
  label,
  value,
  icon: Icon,
  tile,
}: {
  label: string;
  value: number;
  icon: typeof Phone;
  tile: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 ltr-nums">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
