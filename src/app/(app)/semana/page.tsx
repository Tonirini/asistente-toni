import { Header } from "@/components/layout/Header";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StreakBadge } from "@/components/progress/StreakBadge";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { getSemana } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function SemanaPage() {
  const { items, progress, streak } = await getSemana();

  return (
    <div>
      <Header title="Semana" />
      <div className="space-y-3 px-4 py-4">
        <ProgressBar {...progress} />
        <StreakBadge currentStreak={streak.currentStreak} />
      </div>
      <TaskList items={items} emptyMessage="No tenés tareas semanales." />
      <TaskForm />
    </div>
  );
}
