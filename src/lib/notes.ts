import { prisma } from "@/lib/db";

export async function getNotes() {
  return prisma.note.findMany({ orderBy: { createdAt: "desc" } });
}
