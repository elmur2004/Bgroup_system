"use client";

import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CrmPriority } from "@/types";

const PRIORITY_STYLES: Record<CrmPriority, string> = {
  HOT: "bg-red-100 text-red-800",
  WARM: "bg-orange-100 text-orange-800",
  COLD: "bg-blue-100 text-blue-800",
};

export function PriorityBadge({ priority }: { priority: CrmPriority }) {
  const { t } = useLocale();
  return (
    <Badge variant="secondary" className={cn("font-medium", PRIORITY_STYLES[priority])}>
      {t.priorities[priority]}
    </Badge>
  );
}
