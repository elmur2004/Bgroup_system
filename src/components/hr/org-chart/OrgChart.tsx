"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users, GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OrgNode = {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  email: string | null;
  photo: string | null;
  companyId: string;
  departmentId: string | null;
  directManagerId: string | null;
  reports: OrgNode[];
};

type OrgChartResponse = { roots: OrgNode[]; totalEmployees: number };

async function fetchChart(): Promise<OrgChartResponse> {
  const res = await fetch("/api/hr/org-chart");
  if (!res.ok) throw new Error("Failed to load org chart");
  return res.json();
}

function collectDescendantIds(node: OrgNode): Set<string> {
  const out = new Set<string>();
  const walk = (n: OrgNode) => {
    out.add(n.id);
    for (const r of n.reports) walk(r);
  };
  walk(node);
  return out;
}

function findNode(roots: OrgNode[], id: string): OrgNode | null {
  for (const r of roots) {
    if (r.id === id) return r;
    const found = findNode(r.reports, id);
    if (found) return found;
  }
  return null;
}

function countDirectReports(node: OrgNode): number {
  return node.reports.length;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

/**
 * Deterministic colored avatar background per user id. Six-slot palette
 * matches the reference (indigo / violet / emerald / amber / rose / sky).
 */
const AVATAR_PALETTE = [
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
];

function avatarPalette(id: string): { bg: string; text: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export function OrgChart() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr-org-chart"],
    queryFn: fetchChart,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forbiddenDropIds, setForbiddenDropIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (isError || !data) return <EmptyState icon={Users} title="Could not load org chart" />;
  if (data.roots.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No employees yet"
        description="Add employees and assign managers to see the reporting hierarchy."
      />
    );
  }

  async function setManager(employeeId: string, managerId: string | null) {
    const res = await fetch(`/api/hr/employees/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direct_manager: managerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Failed to update manager");
      return;
    }
    toast.success(managerId ? "Manager updated" : "Detached from manager");
    queryClient.invalidateQueries({ queryKey: ["hr-org-chart"] });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        const node = findNode(data.roots, String(e.active.id));
        if (node) {
          const desc = collectDescendantIds(node);
          if (node.directManagerId) desc.add(node.directManagerId);
          setForbiddenDropIds(desc);
        }
        setActiveId(String(e.active.id));
      }}
      onDragEnd={(e: DragEndEvent) => {
        setActiveId(null);
        setForbiddenDropIds(new Set());
        if (!e.over) return;
        const dragged = String(e.active.id);
        const droppedOn = String(e.over.id);
        if (dragged === droppedOn) return;
        if (droppedOn === "TOP_LEVEL") {
          setManager(dragged, null);
          return;
        }
        const node = findNode(data.roots, dragged);
        if (node) {
          const desc = collectDescendantIds(node);
          if (desc.has(droppedOn)) {
            toast.error("Can't make a report your own manager");
            return;
          }
        }
        setManager(dragged, droppedOn);
      }}
      onDragCancel={() => {
        setActiveId(null);
        setForbiddenDropIds(new Set());
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data.totalEmployees} active employees · drag a card onto another to assign a manager
          </p>
          <TopLevelDropZone active={activeId !== null} />
        </div>

        {/* SVG arrowhead defs — reused by every connector. */}
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <marker
              id="org-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
        </svg>

        {/* Chart canvas — slate background panel, scrollable horizontally. */}
        <div className="overflow-x-auto rounded-2xl bg-slate-800 dark:bg-slate-900 p-10 shadow-card">
          <div className="flex flex-row items-start gap-12 min-w-fit">
            {data.roots.map((root) => (
              <SubTree
                key={root.id}
                node={root}
                activeId={activeId}
                forbiddenDropIds={forbiddenDropIds}
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function TopLevelDropZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "TOP_LEVEL" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 border-dashed px-3 py-1.5 text-xs transition-colors",
        active ? "border-primary/50 text-primary" : "border-transparent text-muted-foreground",
        isOver && "bg-primary/10 border-primary"
      )}
    >
      <X className="h-3 w-3 inline-block me-1" />
      Drop here to detach (top-level)
    </div>
  );
}

/**
 * Recursive sub-tree. Renders the node card, then a centered vertical
 * connector down, an arrowhead at the bottom, then a horizontal row of
 * children with their own short downward arrowheads pointing INTO them.
 */
function SubTree({
  node,
  activeId,
  forbiddenDropIds,
}: {
  node: OrgNode;
  activeId: string | null;
  forbiddenDropIds: Set<string>;
}) {
  const hasReports = node.reports.length > 0;

  return (
    <div className="flex flex-col items-center">
      <NodeCard node={node} activeId={activeId} forbiddenDropIds={forbiddenDropIds} />

      {hasReports && (
        <>
          {/* Down arrow from this node */}
          <DownArrow />

          {/* Horizontal bar above the children, drawn only if 2+ children. */}
          {node.reports.length > 1 && (
            <div className="relative w-full">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 h-px bg-slate-500" style={{ width: "calc(100% - 0px)" }} />
            </div>
          )}

          {/* Children */}
          <div className="flex flex-row items-start gap-10 pt-0 relative">
            {/* Horizontal connector across children's tops */}
            {node.reports.length > 1 && (
              <span
                aria-hidden
                className="absolute top-0 left-0 right-0 h-px bg-slate-500"
                style={{
                  left: `calc(50% / ${node.reports.length})`,
                  right: `calc(50% / ${node.reports.length})`,
                }}
              />
            )}
            {node.reports.map((child) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {/* Short downward arrow into each child */}
                <DownArrow short />
                <SubTree node={child} activeId={activeId} forbiddenDropIds={forbiddenDropIds} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DownArrow({ short = false }: { short?: boolean }) {
  return (
    <svg
      width="16"
      height={short ? "20" : "28"}
      viewBox={short ? "0 0 16 20" : "0 0 16 28"}
      className="text-slate-500"
      aria-hidden
    >
      <line
        x1="8"
        y1="0"
        x2="8"
        y2={short ? "16" : "24"}
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <polyline
        points={short ? "4,14 8,20 12,14" : "4,22 8,28 12,22"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NodeCard({
  node,
  activeId,
  forbiddenDropIds,
}: {
  node: OrgNode;
  activeId: string | null;
  forbiddenDropIds: Set<string>;
}) {
  const dragging = activeId === node.id;
  const forbidden = forbiddenDropIds.has(node.id);
  const reportsCount = countDirectReports(node);

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: node.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
    disabled: forbidden || dragging,
  });

  const setRef = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  const palette = avatarPalette(node.id);

  return (
    <div className="relative pt-7 pb-7">
      {/* Avatar — half-overlapping the card top, matching the reference layout. */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <div
          className={cn(
            "h-12 w-12 rounded-full overflow-hidden ring-4 ring-slate-800 dark:ring-slate-900 flex items-center justify-center text-sm font-semibold shadow-md",
            !node.photo && palette.bg,
            !node.photo && palette.text
          )}
        >
          {node.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(node.name)
          )}
        </div>
      </div>

      {/* Card body */}
      <div
        ref={setRef}
        style={style}
        className={cn(
          "relative w-52 select-none rounded-lg bg-white dark:bg-slate-100 px-4 pt-8 pb-4 text-center shadow-md transition-all",
          "border border-transparent",
          isOver && !forbidden && "border-primary ring-2 ring-primary/40 -translate-y-0.5",
          forbidden && activeId !== null && activeId !== node.id && "opacity-40 border-dashed border-slate-400",
          isDragging && "opacity-70 cursor-grabbing shadow-glow"
        )}
      >
        {/* Drag handle in the top-left corner */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 text-slate-400 hover:text-slate-600 cursor-grab"
          aria-label="Drag to assign manager"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <Link
          href={`/hr/employees/${node.id}`}
          className="block text-sm font-bold text-slate-900 truncate hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {node.name}
        </Link>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {node.position || "—"}
        </p>
      </div>

      {/* Reports-count navy pill at the bottom, half-overlapping the card. */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 z-10",
          "h-6 min-w-[1.75rem] px-2 rounded-md bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center shadow-md ring-2 ring-slate-800 dark:ring-slate-900"
        )}
        title={`${reportsCount} direct report${reportsCount === 1 ? "" : "s"}`}
      >
        {reportsCount}
      </div>
    </div>
  );
}
