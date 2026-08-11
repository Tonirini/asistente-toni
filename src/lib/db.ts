import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  // Fallback para que el build de Next.js (que evalúa este módulo al recolectar
  // datos de página) no explote cuando DATABASE_URL todavía no está inyectada.
  const url =
    process.env.DATABASE_URL ??
    "mysql://placeholder:placeholder@localhost:3306/placeholder";
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
