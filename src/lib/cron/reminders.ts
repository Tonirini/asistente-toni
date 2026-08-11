import type { Task } from "@prisma/client";
import { prisma } from "@/lib/db";
import { occurrenceDueMoment, withReminderTime } from "@/lib/cycle";
import { sendWhatsAppMessage } from "@/lib/whatsapp/evolution";

type UsefulData = { link?: string; monto?: number; cuenta?: string };

function buildReminderMessage(task: Task): string {
  const lines = [`⏰ Recordatorio: ${task.title}`];
  if (task.description) lines.push(task.description);

  const usefulData = task.usefulData as UsefulData | null;
  if (usefulData?.monto != null) lines.push(`Monto: $${usefulData.monto}`);
  if (usefulData?.link) lines.push(`Link: ${usefulData.link}`);

  lines.push('Respondé "listo" cuando lo hagas.');
  return lines.join("\n");
}

function antonioPhone(): string {
  return process.env.ANTONIO_CONTACT_PHONE!.replace(/^\+/, "");
}

async function processRecurringOccurrences(now: Date) {
  const dueOccurrences = await prisma.taskOccurrence.findMany({
    where: {
      status: { notIn: ["completado", "abandonado"] },
      nextReminderAt: { lte: now },
      task: { status: { not: "abandonado" } },
    },
    include: { task: true },
  });

  for (const occ of dueOccurrences) {
    const rule = await prisma.reminderRule.findUnique({
      where: { type: occ.task.type },
    });
    if (!rule) continue;

    const escalationMinutes = rule.escalationMinutes as number[];
    const messageText = buildReminderMessage(occ.task);

    await sendWhatsAppMessage(antonioPhone(), messageText);
    await prisma.reminderLog.create({
      data: {
        taskId: occ.taskId,
        occurrenceId: occ.id,
        escalationLevel: occ.escalationLevel,
        messageText,
      },
    });

    const nextLevel = occ.escalationLevel + 1;
    const hasMoreEscalations =
      nextLevel < rule.maxEscalations && escalationMinutes[nextLevel] != null;

    const nextReminderAt = hasMoreEscalations
      ? new Date(
          occurrenceDueMoment(
            occ.task.type,
            occ.cycleDate,
            occ.task.recurrenceDay,
            occ.task.reminderTime
          ).getTime() +
            escalationMinutes[nextLevel] * 60_000
        )
      : null;

    await prisma.taskOccurrence.update({
      where: { id: occ.id },
      data: { escalationLevel: nextLevel, nextReminderAt },
    });
  }
}

async function processPuntuales(now: Date) {
  const candidates = await prisma.task.findMany({
    where: {
      type: "puntual",
      status: { notIn: ["completado", "abandonado"] },
      dueDate: { not: null },
      reminderLogs: { none: {} },
    },
  });

  for (const task of candidates) {
    const dueMoment = withReminderTime(task.dueDate!, task.reminderTime);
    if (dueMoment > now) continue;

    const messageText = buildReminderMessage(task);
    await sendWhatsAppMessage(antonioPhone(), messageText);
    await prisma.reminderLog.create({
      data: { taskId: task.id, escalationLevel: 0, messageText },
    });
  }
}

export async function runReminderEngine() {
  const now = new Date();
  await processRecurringOccurrences(now);
  await processPuntuales(now);
}
