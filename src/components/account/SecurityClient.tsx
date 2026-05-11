"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldOff, KeyRound, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type EnrollState =
  | { phase: "idle" }
  | { phase: "secret-shown"; credentialId: string; secret: string; uri: string }
  | { phase: "verified"; recoveryCodes: string[] };

export function SecurityClient({
  initialMfaEnabled,
  verifiedCredentialCount,
  unusedRecoveryCodes,
}: {
  initialMfaEnabled: boolean;
  verifiedCredentialCount: number;
  unusedRecoveryCodes: number;
}) {
  const [enabled, setEnabled] = useState(initialMfaEnabled);
  const [credCount, setCredCount] = useState(verifiedCredentialCount);
  const [recoveryRemaining, setRecoveryRemaining] = useState(unusedRecoveryCodes);
  const [enroll, setEnroll] = useState<EnrollState>({ phase: "idle" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setBusy(true);
    try {
      const res = await fetch("/api/mfa/enroll", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to start");
      const data = (await res.json()) as { credentialId: string; secret: string; uri: string };
      setEnroll({
        phase: "secret-shown",
        credentialId: data.credentialId,
        secret: data.secret,
        uri: data.uri,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start enrolment");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (enroll.phase !== "secret-shown") return;
    setBusy(true);
    try {
      const res = await fetch("/api/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: enroll.credentialId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify");
      setEnroll({ phase: "verified", recoveryCodes: data.recoveryCodes });
      setEnabled(true);
      setCredCount((c) => c + 1);
      setRecoveryRemaining(data.recoveryCodes.length);
      setCode("");
      toast.success("Two-factor authentication enabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!confirm("Disable 2FA and remove all recovery codes? You'll be able to sign in with just your password.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mfa/disable", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disable");
      setEnabled(false);
      setCredCount(0);
      setRecoveryRemaining(0);
      setEnroll({ phase: "idle" });
      toast.success("2FA disabled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            Two-factor authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {enabled
              ? `${credCount} authenticator${credCount === 1 ? "" : "s"} registered · ${recoveryRemaining} recovery code${recoveryRemaining === 1 ? "" : "s"} remaining`
              : "Adds a one-time code from an authenticator app on top of your password."}
          </p>
        </div>
        {enabled && (
          <Button variant="outline" onClick={disable} disabled={busy}>
            Disable
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!enabled && enroll.phase === "idle" && (
          <Button onClick={startEnroll} disabled={busy}>
            <KeyRound className="h-4 w-4 me-2" />
            Set up authenticator app
          </Button>
        )}

        {enroll.phase === "secret-shown" && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Scan this URL with your authenticator app (1Password, Google Authenticator, etc.) or paste the secret manually:
            </p>
            <div className="rounded border border-border bg-muted/40 p-3 break-all text-xs font-mono">
              {enroll.uri}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Secret:</span>
              <code className="text-xs font-mono">{enroll.secret}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(enroll.secret);
                  toast.success("Secret copied");
                }}
                aria-label="Copy secret"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="max-w-32 tabular-nums tracking-widest"
                  inputMode="numeric"
                  autoFocus
                />
                <Button onClick={verify} disabled={code.length !== 6 || busy}>
                  Verify and enable
                </Button>
              </div>
            </div>
          </div>
        )}

        {enroll.phase === "verified" && (
          <div className="space-y-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Save these recovery codes now</p>
                <p className="text-sm text-muted-foreground">
                  Each code works once if you lose access to your authenticator. They will not be shown again.
                </p>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-1.5 text-sm font-mono">
              {enroll.recoveryCodes.map((c) => (
                <li key={c} className="bg-background rounded px-2 py-1 border border-border">
                  {c}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(enroll.recoveryCodes.join("\n"));
                  toast.success("Recovery codes copied");
                }}
              >
                <Copy className="h-4 w-4 me-2" />
                Copy all
              </Button>
              <Button onClick={() => setEnroll({ phase: "idle" })}>I've saved them</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
