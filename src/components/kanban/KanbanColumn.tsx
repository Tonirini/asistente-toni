"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import type { TaskStatus, Task, Contact } from "@prisma/client";

export function KanbanColumn({
  status,
  label,
  tasks,
}: {
  status: TaskStatus;
  label: string;
  tasks: (Task & { dependsOnContact: Contact | null })[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-xl border border-dashed border-border p-2 transition-colors duration-150",
          isOver && "border-primary bg-accent"
        )}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
