/*
  Warnings:

  - You are about to alter the column `last_active_at` on the `agents` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `last_sync_at` on the `bank_atms` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `expires_at` on the `otp_reservations` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `used_at` on the `otp_reservations` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `refill_at` on the `refill_events` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `last_pulled_at` on the `smart_pull_queue` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `tx_time` on the `transaction_logs` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `last_login_at` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `last_attempt_at` on the `webhook_deliveries` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `next_retry_at` on the `webhook_deliveries` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - Added the required column `payment_method` to the `transaction_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `transaction_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `transaction_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `transaction_logs` DROP FOREIGN KEY `transaction_logs_bank_id_fkey`;

-- DropForeignKey
ALTER TABLE `webhook_deliveries` DROP FOREIGN KEY `webhook_deliveries_bank_id_fkey`;

-- AlterTable
ALTER TABLE `agents` MODIFY `last_active_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `bank_atms` MODIFY `last_sync_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `otp_reservations` MODIFY `expires_at` DATETIME NOT NULL,
    MODIFY `used_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `refill_events` MODIFY `refill_at` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `smart_pull_queue` MODIFY `last_pulled_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `transaction_logs` ADD COLUMN `payment_method` VARCHAR(100) NOT NULL,
    ADD COLUMN `reference` VARCHAR(255) NOT NULL,
    ADD COLUMN `status` VARCHAR(50) NOT NULL,
    MODIFY `bank_id` VARCHAR(36) NULL,
    MODIFY `tx_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `users` MODIFY `last_login_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `webhook_deliveries` MODIFY `bank_id` VARCHAR(36) NULL,
    MODIFY `last_attempt_at` DATETIME NULL,
    MODIFY `next_retry_at` DATETIME NULL;

-- AddForeignKey
ALTER TABLE `transaction_logs` ADD CONSTRAINT `transaction_logs_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
