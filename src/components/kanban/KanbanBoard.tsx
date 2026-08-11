"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Task, TaskStatus, Contact } from "@prisma/client";
import { KANBAN_COLUMNS, KANBAN_LABELS } from "@/types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { ContactPickerDialog } from "@/components/kanban/ContactPickerDialog";
import { updateTaskStatus } from "@/lib/actions/task-actions";

type TaskWithContact = Task & { dependsOnContact: Contact | null };

export function KanbanBoard({
  initialTasks,
  contacts,
}: {
  initialTasks: Record<TaskStatus, TaskWithContact[]>;
  contacts: Contact[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pendingDrop, setPendingDrop] = useState<{
    taskId: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function moveTask(
    taskId: number,
    newStatus: TaskStatus,
    dependsOnContact: Contact | null = null
  ) {
    setTasks((prev) => {
      const next: Record<TaskStatus, TaskWithContact[]> = {
        pendiente: [...prev.pendiente],
        en_proceso: [...prev.en_proceso],
        depende_de_otro: [...prev.depende_de_otro],
        completado: [...prev.completado],
        abandonado: [...prev.abandonado],
      };

      let moved: TaskWithContact | undefined;
      for (const status of KANBAN_COLUMNS) {
        const idx = next[status].findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          [moved] = next[status].splice(idx, 1);
          break;
        }
      }
      if (!moved) return prev;

      next[newStatus] = [
        { ...moved, status: newStatus, dependsOnContact },
        ...next[newStatus],
      ];
      return next;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const newStatus = over.id as TaskStatus;

    const currentStatus = KANBAN_COLUMNS.find((s) =>
      tasks[s].some((t) => t.id === taskId)
    );
    if (!currentStatus || currentStatus === newStatus) return;

    if (newStatus === "depende_de_otro") {
      setPendingDrop({ taskId });
      return;
    }

    moveTask(taskId, newStatus);
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch {
      toast.error("No se pudo mover la tarea");
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto px-4 pb-4">
          {KANBAN_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={KANBAN_LABELS[status]}
              tasks={tasks[status]}
            />
          ))}
        </div>
      </DndContext>

      <ContactPickerDialog
        open={pendingDrop !== null}
        onOpenChange={(v) => {
          if (!v) setPendingDrop(null);
        }}
        contacts={contacts}
        onCancel={() => setPendingDrop(null)}
        onConfirm={async (contactId, contactName) => {
          if (!pendingDrop) return;
          const { taskId } = pendingDrop;
          moveTask(taskId, "depende_de_otro", {
            id: contactId,
            name: contactName,
          } as Contact);
          setPendingDrop(null);
          try {
            await updateTaskStatus(taskId, "depende_de_otro", contactId);
          } catch {
            toast.error("No se pudo mover la tarea");
          }
        }}
      />
    </>
  );
}
