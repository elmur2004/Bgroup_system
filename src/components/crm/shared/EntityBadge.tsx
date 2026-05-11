"use client";

import { Badge } from "@/components/ui/badge";

const ENTITY_COLORS: Record<string, string> = {
  BF: "#F97316",
  BS: "#EC4899",
  MD: "#22C55E",
  BP: "#3B82F6",
};

export function EntityBadge({
  code,
  name,
  color,
}: {
  code: string;
  name?: string;
  color?: string;
}) {
  const bgColor = color || ENTITY_COLORS[code] || "#6B7280";

  return (
    <Badge
      variant="outline"
      className="font-semibold border-0 text-white"
      style={{ backgroundColor: bgColor }}
    >
      {name || code}
    </Badge>
  );
}
