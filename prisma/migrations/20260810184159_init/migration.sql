-- CreateTable
CREATE TABLE `contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phoneE164` VARCHAR(191) NULL,
    `whatsappJid` VARCHAR(191) NULL,
    `whatsappLid` VARCHAR(191) NULL,
    `remoteJidAlt` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contacts_phoneE164_key`(`phoneE164`),
    UNIQUE INDEX `contacts_whatsappJid_key`(`whatsappJid`),
    UNIQUE INDEX `contacts_whatsappLid_key`(`whatsappLid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('diaria', 'semanal', 'mensual', 'puntual') NOT NULL,
    `status` ENUM('pendiente', 'en_proceso', 'depende_de_otro', 'completado', 'abandonado') NOT NULL DEFAULT 'pendiente',
    `dueDate` DATETIME(3) NULL,
    `recurrenceDay` INTEGER NULL,
    `reminderTime` VARCHAR(191) NULL,
    `usefulData` JSON NULL,
    `dependsOnContactId` INTEGER NULL,
    `source` ENUM('whatsapp', 'web') NOT NULL DEFAULT 'web',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `abandonedAt` DATETIME(3) NULL,

    INDEX `tasks_status_idx`(`status`),
    INDEX `tasks_type_idx`(`type`),
    INDEX `tasks_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_occurrences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `cycleDate` DATETIME(3) NOT NULL,
    `status` ENUM('pendiente', 'en_proceso', 'depende_de_otro', 'completado', 'abandonado') NOT NULL DEFAULT 'pendiente',
    `completedAt` DATETIME(3) NULL,
    `nextReminderAt` DATETIME(3) NULL,
    `escalationLevel` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_occurrences_status_idx`(`status`),
    INDEX `task_occurrences_nextReminderAt_idx`(`nextReminderAt`),
    UNIQUE INDEX `task_occurrences_taskId_cycleDate_key`(`taskId`, `cycleDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('diaria', 'semanal', 'mensual', 'puntual') NOT NULL,
    `escalationMinutes` JSON NOT NULL,
    `maxEscalations` INTEGER NOT NULL DEFAULT 2,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reminder_rules_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taskId` INTEGER NOT NULL,
    `occurrenceId` INTEGER NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `escalationLevel` INTEGER NOT NULL,
    `messageText` TEXT NOT NULL,
    `respondedAt` DATETIME(3) NULL,
    `responseText` TEXT NULL,

    INDEX `reminders_log_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbound_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contactId` INTEGER NOT NULL,
    `taskId` INTEGER NULL,
    `bodyText` TEXT NOT NULL,
    `status` ENUM('borrador_pendiente', 'confirmado', 'enviado', 'fallido') NOT NULL DEFAULT 'borrador_pendiente',
    `draftedBy` ENUM('antonio_dictado', 'asistente_redactado') NOT NULL,
    `whatsappMessageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `outbound_messages_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inbound_replies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contactId` INTEGER NOT NULL,
    `outboundMessageId` INTEGER NULL,
    `bodyText` TEXT NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notifiedAntonioAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_dependsOnContactId_fkey` FOREIGN KEY (`dependsOnContactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_occurrences` ADD CONSTRAINT `task_occurrences_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders_log` ADD CONSTRAINT `reminders_log_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders_log` ADD CONSTRAINT `reminders_log_occurrenceId_fkey` FOREIGN KEY (`occurrenceId`) REFERENCES `task_occurrences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_messages` ADD CONSTRAINT `outbound_messages_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `outbound_messages` ADD CONSTRAINT `outbound_messages_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbound_replies` ADD CONSTRAINT `inbound_replies_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbound_replies` ADD CONSTRAINT `inbound_replies_outboundMessageId_fkey` FOREIGN KEY (`outboundMessageId`) REFERENCES `outbound_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

