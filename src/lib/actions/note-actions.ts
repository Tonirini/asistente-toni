"use server";

import { revalidatePath } from "next/cache";
import type { MessageSource } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createNote(content: string, source: MessageSource = "web") {
  const note = await prisma.note.create({ data: { content, source } });
  revalidatePath("/notas");
  return note;
}

export async function updateNote(id: number, content: string) {
  await prisma.note.update({ where: { id }, data: { content } });
  revalidatePath("/notas");
}

export async function deleteNote(id: number) {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notas");
}
