-- AlterTable
ALTER TABLE `outbound_messages`
  ADD COLUMN `instance` ENUM('pruebas', 'gospa') NOT NULL DEFAULT 'pruebas';
