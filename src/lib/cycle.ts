import { addDays, endOfMonth, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import type { TaskType } from "@prisma/client";

/**
 * Convención compartida entre lib/tasks.ts (lecturas) y lib/cron/recurrence.ts
 * (creación de ciclos): cada TaskOccurrence.cycleDate identifica el "balde" al
 * que pertenece — el lunes de la semana para semanales, el día 1 del mes para
 * mensuales. recurrenceDay solo indica en qué día del ciclo cae el aviso.
 */
export function cycleDateFor(type: TaskType, reference: Date = new Date()): Date {
  switch (type) {
    case "diaria":
      return startOfDay(reference);
    case "semanal":
      return startOfWeek(reference, { weekStartsOn: 1 });
    case "mensual":
      return startOfMonth(reference);
    case "puntual":
      return startOfDay(reference);
  }
}

/** Combina la fecha (año/mes/día) de `date` con la hora "HH:mm" de `reminderTime`. */
export function withReminderTime(date: Date, reminderTime: string | null): Date {
  const result = new Date(date);
  if (!reminderTime) {
    result.setHours(0, 0, 0, 0);
    return result;
  }
  const [hours, minutes] = reminderTime.split(":").map(Number);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

/**
 * Momento exacto de vencimiento dentro de un ciclo: cycleDate marca el balde
 * (lunes de la semana / día 1 del mes), recurrenceDay corre ese momento al
 * día del ciclo en que realmente cae el aviso.
 */
export function occurrenceDueMoment(
  type: TaskType,
  cycleDate: Date,
  recurrenceDay: number | null,
  reminderTime: string | null
): Date {
  let day = cycleDate;

  if (type === "semanal" && recurrenceDay) {
    day = addDays(cycleDate, recurrenceDay - 1);
  } else if (type === "mensual" && recurrenceDay) {
    const lastDay = endOfMonth(cycleDate).getDate();
    day = addDays(cycleDate, Math.min(recurrenceDay, lastDay) - 1);
  }

  return withReminderTime(day, reminderTime);
}
