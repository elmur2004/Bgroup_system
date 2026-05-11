"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "text" | "number" | "select" | "date";

type CommonProps<T> = {
  /** Current value to render when not editing. */
  value: T;
  /** Persist the new value. Throw / reject to trigger rollback. */
  onSave: (next: T) => Promise<void> | void;
  /** Optional label for screen readers. */
  ariaLabel?: string;
  /** Disable the editor entirely. */
  disabled?: boolean;
  /** Custom display formatter (defaults to String(value)). */
  format?: (value: T) => ReactNode;
  className?: string;
  inputClassName?: string;
  style?: CSSProperties;
};

type TextProps = CommonProps<string> & { variant: "text"; placeholder?: string; maxLength?: number };
type NumberProps = CommonProps<number> & {
  variant: "number";
  min?: number;
  max?: number;
  step?: number;
};
type SelectProps = CommonProps<string> & {
  variant: "select";
  options: { value: string; label: string }[];
};
type DateProps = CommonProps<string> & { variant: "date" };

export type InlineEditProps = TextProps | NumberProps | SelectProps | DateProps;

/**
 * Click-to-edit cell. Saves on blur or Enter; reverts on Esc.
 * On error, the displayed value rolls back automatically.
 *
 * Pair with `useOptimisticMutation` if the save target needs query-cache rollback.
 */
export function InlineEdit(props: InlineEditProps) {
  const { value, onSave, ariaLabel, disabled, format, className, inputClassName, style } =
    props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | number>(value as string | number);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(value as string | number);
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    if (saving) return;
    let next: unknown = draft;
    if (props.variant === "number") next = Number(draft);
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next as never);
      setEditing(false);
    } catch {
      // Roll back to last persisted value
      setDraft(value as string | number);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value as string | number);
    setEditing(false);
  }

  if (!editing) {
    const displayed = format
      ? format(value as never)
      : props.variant === "select"
        ? (props.options.find((o) => o.value === value)?.label ?? String(value ?? "—"))
        : String(value ?? "—");
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setEditing(true)}
        style={style}
        className={cn(
          "text-start w-full px-2 py-1 -mx-2 -my-1 rounded transition-colors",
          !disabled && "hover:bg-muted/60 cursor-text",
          disabled && "cursor-default",
          className
        )}
        aria-label={ariaLabel ?? "Edit value"}
      >
        {displayed}
      </button>
    );
  }

  const baseInputCls = cn(
    "w-full px-2 py-1 -mx-2 -my-1 rounded border border-primary/40 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
    inputClassName
  );

  if (props.variant === "select") {
    return (
      <span className="inline-flex items-center gap-2 w-full">
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={String(draft)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              cancel();
            }
          }}
          disabled={saving}
          className={baseInputCls}
          aria-label={ariaLabel}
        >
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 w-full">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={
          props.variant === "number"
            ? "number"
            : props.variant === "date"
              ? "date"
              : "text"
        }
        value={String(draft)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
        disabled={saving}
        placeholder={"placeholder" in props ? props.placeholder : undefined}
        maxLength={"maxLength" in props ? props.maxLength : undefined}
        min={"min" in props ? props.min : undefined}
        max={"max" in props ? props.max : undefined}
        step={"step" in props ? props.step : undefined}
        className={baseInputCls}
        aria-label={ariaLabel}
      />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  );
}
