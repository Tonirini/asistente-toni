import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { CalendarGrid, type CalendarItem } from "@/components/calendar/CalendarGrid";
import { getCalendarTasks } from "@/lib/tasks";

export default async function CalendarioPage(
  props: PageProps<"/calendario">
) {
  const searchParams = await props.searchParams;
  const monthParam = Array.isArray(searchParams.mes)
    ? searchParams.mes[0]
    : searchParams.mes;

  const monthAnchor = monthParam
    ? startOfMonth(new Date(`${monthParam}-01T00:00:00`))
    : startOfMonth(new Date());

  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const { puntuales, occurrences } = await getCalendarTasks(
    monthStart,
    new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000)
  );

  const itemsByDay: Record<string, CalendarItem[]> = {};
  function addItem(dateKey: string, item: CalendarItem) {
    (itemsByDay[dateKey] ??= []).push(item);
  }

  for (const t of puntuales) {
    if (!t.dueDate) continue;
    addItem(format(t.dueDate, "yyyy-MM-dd"), {
      id: `task-${t.id}`,
      title: t.title,
      dateKey: format(t.dueDate, "yyyy-MM-dd"),
      done: t.status === "completado",
    });
  }

  for (const o of occurrences) {
    addItem(format(o.cycleDate, "yyyy-MM-dd"), {
      id: `occ-${o.id}`,
      title: o.task.title,
      dateKey: format(o.cycleDate, "yyyy-MM-dd"),
      done: o.status === "completado",
    });
  }

  const prevMonth = format(addMonths(monthAnchor, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthAnchor, 1), "yyyy-MM");

  return (
    <div>
      <Header title="Calendario" />
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/calendario?mes=${prevMonth}`} />}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <span className="text-sm font-medium capitalize text-foreground">
          {format(monthAnchor, "MMMM yyyy", { locale: es })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          render={<Link href={`/calendario?mes=${nextMonth}`} />}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <CalendarGrid monthAnchor={monthAnchor} itemsByDay={itemsByDay} />
    </div>
  );
}
