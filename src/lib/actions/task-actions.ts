"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cycleDateFor } from "@/lib/cycle";
import { computeInitialReminderAt } from "@/lib/reminder-schedule";

const ALL_VIEW_PATHS = [
  "/hoy",
  "/semana",
  "/mes",
  "/avisos",
  "/calendario",
  "/pendientes",
];

function revalidateAll() {
  for (const path of ALL_VIEW_PATHS) revalidatePath(path);
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  type: TaskType;
  dueDate?: Date | null;
  recurrenceDay?: number | null;
  reminderTime?: string | null;
  usefulData?: Record<string, unknown> | null;
  dependsOnContactId?: number | null;
};

export async function createTask(input: CreateTaskInput) {
  const status: TaskStatus = input.dependsOnContactId
    ? "depende_de_otro"
    : "pendiente";

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      status,
      dueDate: input.dueDate ?? null,
      recurrenceDay: input.recurrenceDay ?? null,
      reminderTime: input.reminderTime ?? null,
      usefulData: (input.usefulData ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      dependsOnContactId: input.dependsOnContactId ?? null,
      source: "web",
    },
  });

  if (task.type !== "puntual") {
    const cycleDate = cycleDateFor(task.type);
    const nextReminderAt = await computeInitialReminderAt(
      task.type,
      cycleDate,
      task.recurrenceDay,
      task.reminderTime
    );
    await prisma.taskOccurrence.create({
      data: {
        taskId: task.id,
        cycleDate,
        nextReminderAt,
      },
    });
  }

  revalidateAll();
  return task;
}

export async function updateTaskStatus(
  taskId: number,
  newStatus: TaskStatus,
  dependsOnContactId?: number | null
) {
  if (newStatus === "depende_de_otro" && !dependsOnContactId) {
    throw new Error("dependsOnContactId es obligatorio para depende_de_otro");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      dependsOnContactId:
        newStatus === "depende_de_otro" ? dependsOnContactId : null,
      completedAt: newStatus === "completado" ? new Date() : null,
      abandonedAt: newStatus === "abandonado" ? new Date() : null,
    },
  });

  revalidateAll();
}

export async function deleteTask(taskId: number) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidateAll();
}

export async function toggleOccurrenceDone(
  taskId: number,
  cycleDate: Date,
  done: boolean
) {
  await prisma.taskOccurrence.upsert({
    where: { taskId_cycleDate: { taskId, cycleDate } },
    create: {
      taskId,
      cycleDate,
      status: done ? "completado" : "pendiente",
      completedAt: done ? new Date() : null,
    },
    update: {
      status: done ? "completado" : "pendiente",
      completedAt: done ? new Date() : null,
      nextReminderAt: done ? null : undefined,
    },
  });

  revalidateAll();
}

export async function findOrCreateContact(name: string, phoneE164?: string | null) {
  const existing = await prisma.contact.findFirst({ where: { name } });
  if (existing) {
    if (phoneE164 && !existing.phoneE164) {
      return prisma.contact.update({ where: { id: existing.id }, data: { phoneE164 } });
    }
    return existing;
  }
  return prisma.contact.create({ data: { name, phoneE164: phoneE164 ?? null } });
}
