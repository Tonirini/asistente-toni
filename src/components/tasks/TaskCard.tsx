"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link2, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { cycleDateFor } from "@/lib/cycle";
import {
  toggleOccurrenceDone,
  updateTaskStatus,
} from "@/lib/actions/task-actions";
import type { TaskViewItem } from "@/lib/tasks";

type UsefulData = { link?: string; monto?: number; cuenta?: string };

export function TaskCard({ item }: { item: TaskViewItem }) {
  const { task, isDone } = item;
  const [pending, startTransition] = useTransition();
  const usefulData = task.usefulData as UsefulData | null;

  function handleToggle() {
    startTransition(async () => {
      if (task.type === "puntual") {
        await updateTaskStatus(task.id, isDone ? "pendiente" : "completado");
      } else {
        const cycleDate = item.occurrence?.cycleDate ?? cycleDateFor(task.type);
        await toggleOccurrenceDone(task.id, cycleDate, !isDone);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-opacity duration-150",
        pending && "opacity-60"
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={handleToggle}
        disabled={pending}
        className="mt-0.5 size-5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={cn(
            "text-sm font-medium text-foreground",
            isDone && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.dueDate && (
            <span>{format(task.dueDate, "d 'de' MMM", { locale: es })}</span>
          )}
          {task.reminderTime && <span>{task.reminderTime}</span>}
          {task.status === "depende_de_otro" && (
            <span className="flex items-center gap-1 text-primary">
              <User className="size-3" /> Depende de otro
            </span>
          )}
          {usefulData?.link && (
            <a
              href={usefulData.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary underline"
            >
              <Link2 className="size-3" /> Link
            </a>
          )}
          {usefulData?.monto != null && (
            <span>${usefulData.monto.toLocaleString("es-AR")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
