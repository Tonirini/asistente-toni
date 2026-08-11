import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { occurrenceDueMoment } from "@/lib/cycle";

/**
 * Primer nextReminderAt para un ciclo recién creado (escalationLevel 0),
 * según la ReminderRule vigente para el tipo de tarea.
 */
export async function computeInitialReminderAt(
  type: TaskType,
  cycleDate: Date,
  recurrenceDay: number | null,
  reminderTime: string | null
): Promise<Date | null> {
  const rule = await prisma.reminderRule.findUnique({ where: { type } });
  if (!rule) return null;

  const escalationMinutes = rule.escalationMinutes as number[];
  if (!escalationMinutes.length) return null;

  const dueMoment = occurrenceDueMoment(type, cycleDate, recurrenceDay, reminderTime);
  return new Date(dueMoment.getTime() + escalationMinutes[0] * 60_000);
}
