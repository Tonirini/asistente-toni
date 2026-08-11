import { Header } from "@/components/layout/Header";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StreakBadge } from "@/components/progress/StreakBadge";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { getMes } from "@/lib/tasks";

export default async function MesPage() {
  const { items, progress, streak } = await getMes();

  return (
    <div>
      <Header title="Mes" />
      <div className="space-y-3 px-4 py-4">
        <ProgressBar {...progress} />
        <StreakBadge currentStreak={streak.currentStreak} />
      </div>
      <TaskList items={items} emptyMessage="No tenés tareas mensuales." />
      <TaskForm />
    </div>
  );
}
