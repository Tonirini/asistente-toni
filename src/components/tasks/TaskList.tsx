import { TaskCard } from "@/components/tasks/TaskCard";
import type { TaskViewItem } from "@/lib/tasks";

export function TaskList({
  items,
  emptyMessage = "No hay nada acá.",
}: {
  items: TaskViewItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2 px-4">
      {items.map((item) => (
        <TaskCard key={item.task.id} item={item} />
      ))}
    </div>
  );
}
