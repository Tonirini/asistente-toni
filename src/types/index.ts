import type { Task, TaskOccurrence, Contact } from "@prisma/client";

export type TaskWithOccurrence = Task & {
  occurrences?: TaskOccurrence[];
  dependsOnContact?: Contact | null;
};

export type ProgressStats = {
  total: number;
  completed: number;
  percent: number;
};

export type StreakStats = {
  currentStreak: number;
  bestStreak: number;
};

export const KANBAN_COLUMNS = [
  "pendiente",
  "en_proceso",
  "depende_de_otro",
  "completado",
  "abandonado",
] as const;

export const KANBAN_LABELS: Record<(typeof KANBAN_COLUMNS)[number], string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  depende_de_otro: "Depende de otro",
  completado: "Completado",
  abandonado: "Abandonado",
};
