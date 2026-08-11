import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import type { Task, TaskOccurrence, TaskType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cycleDateFor } from "@/lib/cycle";
import type { ProgressStats, StreakStats } from "@/types";

export type TaskViewItem = {
  task: Task;
  occurrence: TaskOccurrence | null;
  isDone: boolean;
};

function computeProgress(items: { isDone: boolean }[]): ProgressStats {
  const total = items.length;
  const completed = items.filter((i) => i.isDone).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}

function previousCycleDate(type: TaskType, cycleDate: Date): Date {
  switch (type) {
    case "diaria":
      return addDays(cycleDate, -1);
    case "semanal":
      return addWeeks(cycleDate, -1);
    case "mensual":
      return addMonths(cycleDate, -1);
    case "puntual":
      return addDays(cycleDate, -1);
  }
}

async function computeViewStreak(type: TaskType): Promise<StreakStats> {
  const occurrences = await prisma.taskOccurrence.findMany({
    where: { task: { type } },
    orderBy: { cycleDate: "desc" },
    select: { cycleDate: true, status: true },
  });

  if (occurrences.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const currentCycle = cycleDateFor(type);
  const byCycle = new Map<number, boolean>();
  for (const occ of occurrences) {
    const key = occ.cycleDate.getTime();
    if (key === currentCycle.getTime()) continue; // el ciclo en curso no cuenta para la racha
    const allDone = (byCycle.get(key) ?? true) && occ.status === "completado";
    byCycle.set(key, allDone);
  }

  const cycles = [...byCycle.entries()].sort((a, b) => b[0] - a[0]);
  if (cycles.length === 0) return { currentStreak: 0, bestStreak: 0 };

  let currentStreak = 0;
  let expected = previousCycleDate(type, currentCycle).getTime();
  for (const [cycleTime, allDone] of cycles) {
    if (cycleTime !== expected || !allDone) break;
    currentStreak++;
    expected = previousCycleDate(type, new Date(cycleTime)).getTime();
  }

  let bestStreak = 0;
  let running = 0;
  let prevTime: number | null = null;
  for (const [cycleTime, allDone] of cycles) {
    const consecutive =
      prevTime === null ||
      previousCycleDate(type, new Date(prevTime)).getTime() === cycleTime;
    if (allDone && consecutive) {
      running++;
    } else {
      running = allDone ? 1 : 0;
    }
    bestStreak = Math.max(bestStreak, running);
    prevTime = cycleTime;
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
}

export async function getHoy() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const todayCycle = cycleDateFor("diaria", today);

  const diarias = await prisma.task.findMany({
    where: { type: "diaria", status: { notIn: ["abandonado"] } },
    include: { occurrences: { where: { cycleDate: todayCycle } } },
    orderBy: [{ isUrgent: "desc" }, { title: "asc" }],
  });

  const puntualesHoy = await prisma.task.findMany({
    where: {
      type: "puntual",
      status: { notIn: ["completado", "abandonado"] },
      dueDate: { gte: today, lt: tomorrow },
    },
    include: { dependsOnContact: true },
    orderBy: [{ isUrgent: "desc" }, { dueDate: "asc" }],
  });

  const vencidas = await prisma.task.findMany({
    where: {
      type: "puntual",
      status: { notIn: ["completado", "abandonado"] },
      dueDate: { lt: today },
    },
    include: { dependsOnContact: true },
    orderBy: [{ isUrgent: "desc" }, { dueDate: "asc" }],
  });

  const items: TaskViewItem[] = [
    ...diarias.map((t) => ({
      task: t,
      occurrence: t.occurrences[0] ?? null,
      isDone: t.occurrences[0]?.status === "completado",
    })),
    ...vencidas.map((t) => ({
      task: t,
      occurrence: null,
      isDone: false,
    })),
    ...puntualesHoy.map((t) => ({
      task: t,
      occurrence: null,
      isDone: t.status === "completado",
    })),
  ];

  const progress = computeProgress(items);
  const streak = await computeViewStreak("diaria");

  return { items, progress, streak, vencidasCount: vencidas.length };
}

export async function getSemana() {
  const cycle = cycleDateFor("semanal");

  const semanales = await prisma.task.findMany({
    where: { type: "semanal", status: { notIn: ["abandonado"] } },
    include: { occurrences: { where: { cycleDate: cycle } } },
    orderBy: [{ isUrgent: "desc" }, { title: "asc" }],
  });

  const items: TaskViewItem[] = semanales.map((t) => ({
    task: t,
    occurrence: t.occurrences[0] ?? null,
    isDone: t.occurrences[0]?.status === "completado",
  }));

  const progress = computeProgress(items);
  const streak = await computeViewStreak("semanal");

  return { items, progress, streak };
}

export async function getMes() {
  const cycle = cycleDateFor("mensual");

  const mensuales = await prisma.task.findMany({
    where: { type: "mensual", status: { notIn: ["abandonado"] } },
    include: { occurrences: { where: { cycleDate: cycle } } },
    orderBy: [{ isUrgent: "desc" }, { title: "asc" }],
  });

  const items: TaskViewItem[] = mensuales.map((t) => ({
    task: t,
    occurrence: t.occurrences[0] ?? null,
    isDone: t.occurrences[0]?.status === "completado",
  }));

  const progress = computeProgress(items);
  const streak = await computeViewStreak("mensual");

  return { items, progress, streak };
}

export async function getAvisos() {
  const today = startOfDay(new Date());

  const proximos = await prisma.task.findMany({
    where: {
      type: "puntual",
      status: { notIn: ["completado", "abandonado"] },
    },
    include: { dependsOnContact: true },
    orderBy: [{ isUrgent: "desc" }, { dueDate: "asc" }],
  });

  const historial = await prisma.task.findMany({
    where: {
      type: "puntual",
      status: { in: ["completado", "abandonado"] },
    },
    include: { dependsOnContact: true },
    orderBy: { dueDate: "desc" },
    take: 30,
  });

  const proximosItems: TaskViewItem[] = proximos
    .filter((t) => t.dueDate)
    .map((t) => ({ task: t, occurrence: null, isDone: false }));

  const sinFechaItems: TaskViewItem[] = proximos
    .filter((t) => !t.dueDate)
    .map((t) => ({ task: t, occurrence: null, isDone: false }));

  const historialItems: TaskViewItem[] = historial.map((t) => ({
    task: t,
    occurrence: null,
    isDone: t.status === "completado",
  }));

  const vencidasCount = proximos.filter(
    (t) => t.dueDate && t.dueDate < today
  ).length;

  const progress = computeProgress(historialItems);

  let currentStreak = 0;
  for (const t of historial) {
    if (t.status === "completado") currentStreak++;
    else break;
  }

  return {
    proximosItems,
    sinFechaItems,
    historialItems,
    vencidasCount,
    progress,
    streak: { currentStreak, bestStreak: currentStreak } as StreakStats,
  };
}

export async function getKanban() {
  const tasks = await prisma.task.findMany({
    include: { dependsOnContact: true },
    orderBy: [{ isUrgent: "desc" }, { updatedAt: "desc" }],
  });

  return {
    pendiente: tasks.filter((t) => t.status === "pendiente"),
    en_proceso: tasks.filter((t) => t.status === "en_proceso"),
    depende_de_otro: tasks.filter((t) => t.status === "depende_de_otro"),
    completado: tasks.filter((t) => t.status === "completado"),
    abandonado: tasks.filter((t) => t.status === "abandonado"),
  };
}

export async function getCalendarTasks(monthStart: Date, monthEnd: Date) {
  const puntuales = await prisma.task.findMany({
    where: { dueDate: { gte: monthStart, lt: monthEnd } },
    include: { dependsOnContact: true },
    orderBy: { dueDate: "asc" },
  });

  const occurrences = await prisma.taskOccurrence.findMany({
    where: { cycleDate: { gte: monthStart, lt: monthEnd } },
    include: { task: true },
    orderBy: { cycleDate: "asc" },
  });

  return { puntuales, occurrences };
}
