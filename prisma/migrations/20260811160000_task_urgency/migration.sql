-- AlterTable
ALTER TABLE `tasks`
  ADD COLUMN `isUrgent` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `nextReminderAt` DATETIME(3) NULL,
  ADD COLUMN `escalationLevel` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `tasks_nextReminderAt_idx` ON `tasks`(`nextReminderAt`);
