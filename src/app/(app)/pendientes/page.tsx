import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { getKanban } from "@/lib/tasks";
import { prisma } from "@/lib/db";

export default async function PendientesPage() {
  const [kanban, contacts] = await Promise.all([
    getKanban(),
    prisma.contact.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Header title="Pendientes" />
      <KanbanBoard initialTasks={kanban} contacts={contacts} />
      <TaskForm />
    </div>
  );
}
