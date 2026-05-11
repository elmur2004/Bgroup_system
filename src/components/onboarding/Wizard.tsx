"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, UserPlus, Users, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: Building2,
    title: "Create your first company",
    description:
      "Define a company so employees and payroll can be scoped to it. You can add more later.",
    cta: "Open company settings",
    href: "/hr/settings/companies",
  },
  {
    id: 2,
    icon: UserPlus,
    title: "Add your first employee",
    description:
      "Once a company exists, create an employee record so you can start tracking attendance and payroll.",
    cta: "Add an employee",
    href: "/hr/employees/add",
  },
  {
    id: 3,
    icon: Users,
    title: "Invite a colleague",
    description:
      "Share access with your HR or finance teammates so they can pitch in.",
    cta: "Open user settings",
    href: "/hr/settings/users",
  },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/check");
        if (!res.ok) return;
        const data = (await res.json()) as { show: boolean };
        if (!cancelled && data.show) setOpen(true);
      } catch {
        // ignore — wizard is non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function dismiss() {
    setOpen(false);
    try {
      await fetch("/api/onboarding/check", { method: "POST" });
    } catch {
      // best-effort
    }
  }

  if (!open) return null;

  const Step = STEPS[step];
  const Icon = Step.icon;
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) void dismiss();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to BGroup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s.id} className="flex items-center gap-2">
                <span
                  className={
                    i < step
                      ? "h-2 w-6 rounded-full bg-primary"
                      : i === step
                        ? "h-2 w-6 rounded-full bg-primary/60"
                        : "h-2 w-6 rounded-full bg-muted"
                  }
                />
              </span>
            ))}
            <span className="ms-2">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          <div className="flex gap-3">
            <div className="rounded-full bg-primary/10 p-2 h-fit">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{Step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {Step.description}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" onClick={dismiss}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            <Link href={Step.href} onClick={dismiss}>
              <Button>{Step.cta}</Button>
            </Link>
            {!last && (
              <Button variant="outline" onClick={() => setStep((s) => s + 1)}>
                <CheckCircle2 className="h-4 w-4 me-2" />
                Mark done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
