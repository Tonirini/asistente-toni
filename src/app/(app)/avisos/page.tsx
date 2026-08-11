import { Header } from "@/components/layout/Header";
import { ProgressBar } from "@/components/progress/ProgressBar";
import { StreakBadge } from "@/components/progress/StreakBadge";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { getAvisos } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export default async function AvisosPage() {
  const {
    proximosItems,
    sinFechaItems,
    historialItems,
    vencidasCount,
    progress,
    streak,
  } = await getAvisos();

  return (
    <div>
      <Header title="Avisos" />
      <div className="space-y-3 px-4 py-4">
        <ProgressBar {...progress} />
        <div className="flex items-center gap-2">
          <StreakBadge currentStreak={streak.currentStreak} />
          {vencidasCount > 0 && (
            <span className="text-xs font-medium text-destructive">
              {vencidasCount} vencido{vencidasCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Próximos
        </h2>
      </div>
      <TaskList
        items={proximosItems}
        emptyMessage="No hay avisos puntuales próximos."
      />

      <div className="px-4 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Sin fecha
        </h2>
      </div>
      <TaskList
        items={sinFechaItems}
        emptyMessage="No hay pendientes sin fecha."
      />

      <div className="px-4 pt-6 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Historial
        </h2>
      </div>
      <TaskList items={historialItems} emptyMessage="Sin historial todavía." />
      <TaskForm />
    </div>
  );
}
