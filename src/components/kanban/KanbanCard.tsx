"use client";

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Task, Contact } from "@prisma/client";

const TYPE_LABELS: Record<Task["type"], string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
  puntual: "Puntual",
};

export function KanbanCard({
  task,
}: {
  task: Task & { dependsOnContact: Contact | null };
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none space-y-1 rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing",
        isDragging && "z-50 opacity-70"
      )}
    >
      <p className="text-sm font-medium text-foreground">{task.title}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{TYPE_LABELS[task.type]}</span>
        {task.dueDate && (
          <span>{format(task.dueDate, "d MMM", { locale: es })}</span>
        )}
        {task.dependsOnContact && (
          <span className="text-primary">{task.dependsOnContact.name}</span>
        )}
      </div>
    </div>
  );
}
