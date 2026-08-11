import { Header } from "@/components/layout/Header";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StreakBadge } from "@/components/progress/StreakBadge";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { getHoy } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const { items, progress, streak, vencidasCount } = await getHoy();

  return (
    <div>
      <Header title="Hoy" />
      <div className="space-y-3 px-4 py-4">
        <ProgressBar {...progress} />
        <div className="flex items-center gap-2">
          <StreakBadge currentStreak={streak.currentStreak} />
          {vencidasCount > 0 && (
            <span className="text-xs font-medium text-destructive">
              {vencidasCount} vencida{vencidasCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <TaskList items={items} emptyMessage="No tenés nada para hoy." />
      <TaskForm />
    </div>
  );
}
