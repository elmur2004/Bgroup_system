import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Lucide icon to render when no `illustration` is provided. */
  icon?: LucideIcon;
  /** Optional inline SVG / image element for richer visuals. Overrides `icon`. */
  illustration?: ReactNode;
  title: string;
  description?: string;
  /** Primary CTA. */
  action?: ReactNode;
  /** Optional secondary CTA — typically "Learn more" or "Import". */
  secondaryAction?: ReactNode;
  /** Compact variant for inline empty states (e.g. inside a card). */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<EmptyStateProps["size"]>, string> = {
  sm: "py-6",
  md: "py-12",
  lg: "py-20",
};

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        SIZE_CLASSES[size],
        className
      )}
    >
      {illustration ? (
        <div className="mb-4">{illustration}</div>
      ) : Icon ? (
        <div className="rounded-full bg-muted p-3 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
