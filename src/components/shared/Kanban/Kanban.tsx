"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export type KanbanColumn<TKey extends string = string> = {
  id: TKey;
  title: string;
  /** Optional accent class for the column header (e.g. `bg-emerald-50 text-emerald-700`). */
  headerClass?: string;
  /** Sublabel shown next to the title (e.g. count or formatted total). */
  subtitle?: string;
  /** Disable dropping into this column. */
  disabled?: boolean;
};

export type KanbanItem<TKey extends string = string> = {
  id: string;
  columnId: TKey;
};

export type KanbanProps<T extends KanbanItem<TKey>, TKey extends string = string> = {
  columns: KanbanColumn<TKey>[];
  items: T[];
  /** Render a card for a given item. Receives `isDragging` so the card can dim itself. */
  renderCard: (item: T, opts: { isDragging: boolean }) => ReactNode;
  /** Called when the user drops an item into a different column. */
  onMove: (item: T, toColumn: TKey, fromColumn: TKey) => void | Promise<void>;
  /** Optional empty state renderer per column. */
  renderEmpty?: (column: KanbanColumn<TKey>) => ReactNode;
  /** Footer (e.g. "Showing 50 of 200"). */
  footer?: ReactNode;
};

export function Kanban<T extends KanbanItem<TKey>, TKey extends string>({
  columns,
  items,
  renderCard,
  onMove,
  renderEmpty,
  footer,
}: KanbanProps<T, TKey>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const itemsByColumn = useMemo(() => {
    const map = new Map<TKey, T[]>();
    columns.forEach((c) => map.set(c.id, []));
    items.forEach((i) => {
      const list = map.get(i.columnId);
      if (list) list.push(i);
    });
    return map;
  }, [columns, items]);

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const item = items.find((i) => i.id === String(active.id));
    if (!item) return;
    const toCol = String(over.id) as TKey;
    if (toCol === item.columnId) return;
    if (!columns.some((c) => c.id === toCol && !c.disabled)) return;
    void onMove(item, toCol, item.columnId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => (
          <KanbanColumnDroppable
            key={column.id}
            column={column}
            items={itemsByColumn.get(column.id) ?? []}
            renderCard={(item) =>
              renderCard(item, { isDragging: item.id === activeId })
            }
            renderEmpty={renderEmpty}
          />
        ))}
      </div>
      {footer && <div className="mt-2 text-sm text-muted-foreground">{footer}</div>}

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="rotate-1 shadow-lg cursor-grabbing">
            {renderCard(activeItem, { isDragging: true })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumnDroppable<T extends KanbanItem<TKey>, TKey extends string>({
  column,
  items,
  renderCard,
  renderEmpty,
}: {
  column: KanbanColumn<TKey>;
  items: T[];
  renderCard: (item: T) => ReactNode;
  renderEmpty?: (column: KanbanColumn<TKey>) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: column.disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 rounded-lg border bg-card flex flex-col",
        isOver && !column.disabled && "ring-2 ring-primary",
        column.disabled && "opacity-60"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b text-sm font-medium",
          column.headerClass
        )}
      >
        <span>{column.title}</span>
        {column.subtitle && (
          <span className="text-xs text-muted-foreground font-normal">{column.subtitle}</span>
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-32">
        {items.length === 0
          ? (renderEmpty?.(column) ?? (
              <div className="text-xs text-muted-foreground text-center py-6">
                Empty
              </div>
            ))
          : items.map((item) => (
              <KanbanDraggable key={item.id} id={item.id}>
                {renderCard(item)}
              </KanbanDraggable>
            ))}
      </div>
    </div>
  );
}

function KanbanDraggable({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab", isDragging && "opacity-40")}
    >
      {children}
    </div>
  );
}
