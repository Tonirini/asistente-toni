import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cycleDateFor } from "@/lib/cycle";
import { computeInitialReminderAt } from "@/lib/reminder-schedule";

async function resetCyclesFor(type: TaskType) {
  const cycleDate = cycleDateFor(type);

  const tasks = await prisma.task.findMany({
    where: { type, status: { not: "abandonado" } },
  });

  for (const task of tasks) {
    const exists = await prisma.taskOccurrence.findUnique({
      where: { taskId_cycleDate: { taskId: task.id, cycleDate } },
    });
    if (exists) continue;

    const nextReminderAt = await computeInitialReminderAt(
      type,
      cycleDate,
      task.recurrenceDay,
      task.reminderTime
    );

    await prisma.taskOccurrence.create({
      data: { taskId: task.id, cycleDate, nextReminderAt },
    });
  }
}

export async function resetDailyCycles() {
  await resetCyclesFor("diaria");
}

export async function resetWeeklyCycles() {
  await resetCyclesFor("semanal");
}

export async function resetMonthlyCycles() {
  await resetCyclesFor("mensual");
}
