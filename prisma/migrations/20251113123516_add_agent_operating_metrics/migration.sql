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

*/
-- AlterTable
ALTER TABLE `agents` ADD COLUMN `avg_daily_withdrawals` DECIMAL(15, 2) NULL,
    ADD COLUMN `last_metrics_update` DATETIME NULL,
    ADD COLUMN `operating_float_target` DECIMAL(15, 2) NULL,
    ADD COLUMN `peak_daily_withdrawal` DECIMAL(15, 2) NULL,
    MODIFY `last_active_at` DATETIME NULL;

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
ALTER TABLE `transaction_logs` MODIFY `tx_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `users` MODIFY `last_login_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `webhook_deliveries` MODIFY `last_attempt_at` DATETIME NULL,
    MODIFY `next_retry_at` DATETIME NULL;
