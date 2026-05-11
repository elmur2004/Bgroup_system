"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListChecks, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OnboardingChecklistButton({ employeeId }: { employeeId: string }) {
  const [exists, setExists] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/hr/employees/${employeeId}/onboarding-checklist`)
      .then((r) => (r.ok ? r.json() : { exists: false }))
      .then((d) => setExists(!!d.exists))
      .catch(() => setExists(false));
  }, [employeeId]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/onboarding-checklist`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create checklist");
        if (res.status === 409) setExists(true);
        return;
      }
      toast.success(`Created onboarding checklist (${data.childCount} steps)`);
      setExists(true);
    } finally {
      setCreating(false);
    }
  }

  if (exists === null) return null;

  if (exists) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        Onboarding checklist already created — see tasks below.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-3 rounded-md border border-dashed">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ListChecks className="h-4 w-4" />
        Generate the standard 10-step onboarding checklist for this hire.
      </div>
      <Button size="sm" onClick={create} disabled={creating}>
        {creating ? (
          <>
            <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
            Creating...
          </>
        ) : (
          "Create checklist"
        )}
      </Button>
    </div>
  );
}
