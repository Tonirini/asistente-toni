import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.reminderRule.upsert({
    where: { type: "diaria" },
    update: {},
    create: { type: "diaria", escalationMinutes: [0], maxEscalations: 1 },
  });
  await prisma.reminderRule.upsert({
    where: { type: "semanal" },
    update: {},
    create: { type: "semanal", escalationMinutes: [0, 1440], maxEscalations: 2 },
  });
  await prisma.reminderRule.upsert({
    where: { type: "mensual" },
    update: {},
    create: {
      type: "mensual",
      escalationMinutes: [0, 1440, 4320],
      maxEscalations: 3,
    },
  });
  await prisma.reminderRule.upsert({
    where: { type: "puntual" },
    update: {},
    create: { type: "puntual", escalationMinutes: [0], maxEscalations: 1 },
  });

  console.log("reminder_rules sembradas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
