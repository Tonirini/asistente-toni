-- AlterTable
ALTER TABLE `chat_messages` ADD COLUMN `whatsappMessageId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `chat_messages_whatsappMessageId_key` ON `chat_messages`(`whatsappMessageId`);
