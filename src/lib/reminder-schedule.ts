import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { occurrenceDueMoment, withReminderTime } from "@/lib/cycle";

/** Escalado fijo (no configurable) para tareas puntuales marcadas urgentes. */
export const URGENT_ESCALATION_MINUTES = [0, 60, 180, 360, 720];

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

/**
 * Primer nextReminderAt para una tarea puntual recién creada. Si es urgente,
 * usa el escalado fijo y arranca ya mismo si no tiene fecha. Si no es urgente
 * y no tiene fecha, no se programa ningún recordatorio (queda en Avisos/Pendientes).
 */
export async function computePuntualInitialReminderAt(
  dueDate: Date | null,
  reminderTime: string | null,
  isUrgent: boolean
): Promise<Date | null> {
  if (!dueDate && !isUrgent) return null;

  const dueMoment = dueDate ? withReminderTime(dueDate, reminderTime) : new Date();

  if (isUrgent) {
    return new Date(dueMoment.getTime() + URGENT_ESCALATION_MINUTES[0] * 60_000);
  }

  const rule = await prisma.reminderRule.findUnique({ where: { type: "puntual" } });
  if (!rule) return null;
  const escalationMinutes = rule.escalationMinutes as number[];
  if (!escalationMinutes.length) return null;

  return new Date(dueMoment.getTime() + escalationMinutes[0] * 60_000);
}
