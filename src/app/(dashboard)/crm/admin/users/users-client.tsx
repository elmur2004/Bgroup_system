"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser } from "../actions";
import type { CrmRole } from "@/types";

type UserItem = {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  email: string;
  role: CrmRole;
  entityId: string | null;
  monthlyTargetEGP: unknown;
  active: boolean;
  entity: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
    color: string;
  } | null;
};

type EntityItem = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  color: string;
  active: boolean;
};

const ROLES: CrmRole[] = ["CEO", "ADMIN", "MANAGER", "REP", "TECH_DIRECTOR", "FINANCE"];

export function UsersClient({
  users,
  entities,
}: {
  users: UserItem[];
  entities: EntityItem[];
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [fullNameAr, setFullNameAr] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CrmRole>("REP");
  const [entityId, setEntityId] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

  const roleLabels = t.roles as Record<string, string>;

  function openCreate() {
    setEditing(null);
    setFullName("");
    setFullNameAr("");
    setEmail("");
    setRole("REP");
    setEntityId("");
    setMonthlyTarget("");
    setOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditing(user);
    setFullName(user.fullName);
    setFullNameAr(user.fullNameAr ?? "");
    setEmail(user.email);
    setRole(user.role);
    setEntityId(user.entityId ?? "");
    setMonthlyTarget(user.monthlyTargetEGP ? String(Number(user.monthlyTargetEGP)) : "");
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await updateUser(editing.id, {
          fullName,
          fullNameAr: fullNameAr || undefined,
          email,
          role,
          entityId: entityId || null,
          monthlyTargetEGP: monthlyTarget ? Number(monthlyTarget) : null,
        });
      } else {
        await createUser({
          fullName,
          fullNameAr: fullNameAr || undefined,
          email,
          role,
          entityId: entityId || undefined,
          monthlyTargetEGP: monthlyTarget ? Number(monthlyTarget) : undefined,
        });
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserItem) {
    await updateUser(user.id, { active: !user.active });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.nav.users}</h1>
        <Button onClick={openCreate}>{t.common.create}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.name}</TableHead>
                  <TableHead>{t.common.email}</TableHead>
                  <TableHead>{locale === "ar" ? "الدور" : "CrmRole"}</TableHead>
                  <TableHead>{t.forms.entity}</TableHead>
                  <TableHead>{locale === "ar" ? "الهدف الشهري" : "Monthly Target"}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {locale === "ar" && user.fullNameAr
                        ? user.fullNameAr
                        : user.fullName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.entity ? (
                        <Badge
                          style={{ backgroundColor: user.entity.color, color: "#fff" }}
                        >
                          {locale === "ar"
                            ? user.entity.nameAr
                            : user.entity.nameEn}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="ltr-nums">
                      {user.monthlyTargetEGP
                        ? Number(user.monthlyTargetEGP).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <Badge variant="default" className="bg-emerald-600">
                          {t.common.active}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t.common.inactive}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                        >
                          {t.common.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(user)}
                        >
                          {user.active ? t.common.inactive : t.common.active}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t.common.edit : t.common.create} {t.nav.users}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t.common.name} (EN)
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t.common.name} (AR)
              </label>
              <Input
                value={fullNameAr}
                onChange={(e) => setFullNameAr(e.target.value)}
                placeholder="الاسم الكامل"
                dir="rtl"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t.common.email}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {locale === "ar" ? "الدور" : "CrmRole"}
              </label>
              <Select value={role} onValueChange={(v) => setRole(v as CrmRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r] ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t.forms.entity}</label>
              <Select value={entityId} onValueChange={(v) => setEntityId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t.forms.selectEntity} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {entities
                    .filter((e) => e.active)
                    .map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {locale === "ar" ? entity.nameAr : entity.nameEn} ({entity.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {locale === "ar" ? "الهدف الشهري (ج.م)" : "Monthly Target (EGP)"}
              </label>
              <Input
                type="number"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !fullName || !email}>
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
