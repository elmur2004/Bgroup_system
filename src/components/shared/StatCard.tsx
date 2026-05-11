import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatTone = "indigo" | "violet" | "emerald" | "amber" | "rose" | "sky";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  /** Color slot for the icon tile and trend accents. */
  tone?: StatTone;
  className?: string;
}

const TONE_TILE: Record<StatTone, string> = {
  indigo: "tile-indigo",
  violet: "tile-violet",
  emerald: "tile-emerald",
  amber: "tile-amber",
  rose: "tile-rose",
  sky: "tile-sky",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  tone = "indigo",
  className,
}: StatCardProps) {
  const tileClass = TONE_TILE[tone];
  return (
    <Card className={cn("transition-transform hover:-translate-y-0.5", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl md:text-[1.75rem] font-bold text-foreground mt-2 leading-tight tracking-tight">
              {value}
            </p>
            {trend && (
              <p
                className={cn(
                  "text-xs mt-1 font-medium",
                  trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                tileClass
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
