-- CreateTable
CREATE TABLE `banks` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `status` ENUM('active', 'suspended', 'onboarding') NOT NULL DEFAULT 'onboarding',
    `webhook_url` VARCHAR(255) NULL,
    `webhook_secret` VARCHAR(128) NULL,
    `atm_api_url` VARCHAR(255) NULL,
    `atm_api_key_encrypted` VARBINARY(512) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    UNIQUE INDEX `banks_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_configs` (
    `bank_id` VARCHAR(36) NOT NULL,
    `threshold_low` DECIMAL(5, 4) NOT NULL DEFAULT 0.7000,
    `threshold_high` DECIMAL(5, 4) NOT NULL DEFAULT 1.3000,
    `branding` JSON NULL,

    PRIMARY KEY (`bank_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agents` (
    `id` VARCHAR(36) NOT NULL,
    `bank_id` VARCHAR(36) NOT NULL,
    `agent_id` VARCHAR(50) NOT NULL,
    `terminal_id` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(150) NULL,
    `nin` VARCHAR(11) NULL,
    `bvn` VARCHAR(11) NULL,
    `work_location` POINT NOT NULL,
    `work_address` VARCHAR(255) NULL,
    `assigned_limit` DECIMAL(15, 2) NOT NULL,
    `onboarded_via` ENUM('api', 'manual') NOT NULL,
    `status` ENUM('active', 'suspended', 'fraud', 'inactive') NOT NULL DEFAULT 'active',
    `last_active_at` DATETIME NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    INDEX `agents_bank_id_status_idx`(`bank_id`, `status`),
    INDEX `agents_terminal_id_idx`(`terminal_id`),
    INDEX `agents_bank_id_agent_id_idx`(`bank_id`, `agent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `bank_id` VARCHAR(36) NULL,
    `agent_id` VARCHAR(36) NULL,
    `role_id` INTEGER NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARBINARY(60) NULL,
    `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
    `last_login_at` DATETIME NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_bank_id_role_id_idx`(`bank_id`, `role_id`),
    INDEX `users_agent_id_idx`(`agent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bank_id` VARCHAR(36) NOT NULL,
    `agent_id` VARCHAR(36) NOT NULL,
    `terminal_id` VARCHAR(50) NULL,
    `tx_type` ENUM('withdrawal', 'deposit') NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `tx_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    `location_lat` DECIMAL(10, 8) NULL,
    `location_lng` DECIMAL(11, 8) NULL,
    `source` ENUM('webhook', 'api_pull') NOT NULL DEFAULT 'webhook',

    INDEX `transaction_logs_bank_id_tx_time_idx`(`bank_id`, `tx_time`),
    INDEX `transaction_logs_agent_id_tx_time_idx`(`agent_id`, `tx_time`),
    INDEX `transaction_logs_terminal_id_idx`(`terminal_id`),
    INDEX `transaction_logs_location_lat_location_lng_idx`(`location_lat`, `location_lng`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refill_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `agent_id` CHAR(36) NOT NULL,
    `bank_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `source` ENUM('atm') NOT NULL DEFAULT 'atm',
    `source_ref` VARCHAR(100) NULL,
    `refill_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `refill_events_agent_id_refill_at_idx`(`agent_id`, `refill_at`),
    INDEX `refill_events_bank_id_refill_at_idx`(`bank_id`, `refill_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_atms` (
    `id` VARCHAR(36) NOT NULL,
    `bank_id` VARCHAR(36) NOT NULL,
    `atm_code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NULL,
    `location` POINT NOT NULL,
    `address` VARCHAR(255) NULL,
    `float_available` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `float_reserved` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `last_sync_at` DATETIME NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `bank_atms_bank_id_float_available_idx`(`bank_id`, `float_available`),
    INDEX `bank_atms_bank_id_atm_code_idx`(`bank_id`, `atm_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_float_snapshots` (
    `agent_id` VARCHAR(36) NOT NULL,
    `bank_id` VARCHAR(36) NOT NULL,
    `e_float` DECIMAL(15, 2) NOT NULL,
    `cash_in_hand` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `source` ENUM('webhook', 'pull', 'fallback') NOT NULL,
    `last_updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `staleness_score` TINYINT NOT NULL DEFAULT 0,

    INDEX `agent_float_snapshots_bank_id_e_float_idx`(`bank_id`, `e_float`),
    INDEX `agent_float_snapshots_staleness_score_last_updated_at_idx`(`staleness_score`, `last_updated_at`),
    PRIMARY KEY (`agent_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_reservations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `agent_id` VARCHAR(36) NOT NULL,
    `bank_id` VARCHAR(36) NOT NULL,
    `atm_id` VARCHAR(36) NOT NULL,
    `otp_code` VARCHAR(6) NOT NULL,
    `amount_needed` DECIMAL(15, 2) NOT NULL,
    `amount_reserved` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('issued', 'used', 'expired') NOT NULL DEFAULT 'issued',
    `issued_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `expires_at` DATETIME NOT NULL,
    `used_at` DATETIME NULL,

    INDEX `otp_reservations_otp_code_idx`(`otp_code`),
    INDEX `otp_reservations_agent_id_status_idx`(`agent_id`, `status`),
    INDEX `otp_reservations_expires_at_idx`(`expires_at`),
    INDEX `otp_reservations_atm_id_idx`(`atm_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `smart_pull_queue` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bank_id` VARCHAR(36) NOT NULL,
    `agent_id` VARCHAR(191) NOT NULL,
    `priority` TINYINT NOT NULL DEFAULT 1,
    `last_pulled_at` DATETIME NULL,
    `pull_after` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `status` ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `smart_pull_queue_agent_id_key`(`agent_id`),
    INDEX `smart_pull_queue_bank_id_priority_pull_after_idx`(`bank_id`, `priority`, `pull_after`),
    INDEX `smart_pull_queue_agent_id_idx`(`agent_id`),
    UNIQUE INDEX `smart_pull_queue_bank_id_agent_id_key`(`bank_id`, `agent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_deliveries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bank_id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(100) NOT NULL,
    `payload_hash` VARCHAR(64) NOT NULL,
    `status` ENUM('received', 'processed', 'failed', 'retry') NOT NULL DEFAULT 'received',
    `attempt_count` TINYINT NOT NULL DEFAULT 1,
    `last_attempt_at` DATETIME NULL,
    `next_retry_at` DATETIME NULL,
    `error_message` TEXT NULL,

    INDEX `webhook_deliveries_bank_id_event_id_idx`(`bank_id`, `event_id`),
    INDEX `webhook_deliveries_status_next_retry_at_idx`(`status`, `next_retry_at`),
    UNIQUE INDEX `webhook_deliveries_bank_id_event_id_key`(`bank_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bank_id` VARCHAR(36) NOT NULL,
    `agent_id` VARCHAR(36) NULL,
    `event_type` VARCHAR(50) NOT NULL,
    `event_data` JSON NOT NULL,
    `actor_type` ENUM('system', 'bank_admin', 'agent') NOT NULL,
    `actor_id` VARCHAR(100) NULL,
    `ip_address` VARBINARY(16) NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `audit_log_bank_id_event_type_created_at_idx`(`bank_id`, `event_type`, `created_at`),
    INDEX `audit_log_agent_id_idx`(`agent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `atm_feedback` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `otp_id` BIGINT NOT NULL,
    `agent_id` VARCHAR(36) NOT NULL,
    `atm_id` VARCHAR(36) NOT NULL,
    `event` ENUM('withdrawal_success', 'withdrawal_failed', 'code_invalid') NOT NULL,
    `amount_dispensed` DECIMAL(15, 2) NULL,
    `event_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `raw_payload` JSON NULL,

    UNIQUE INDEX `atm_feedback_otp_id_key`(`otp_id`),
    INDEX `atm_feedback_otp_id_idx`(`otp_id`),
    INDEX `atm_feedback_agent_id_idx`(`agent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_domains` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bank_id` VARCHAR(36) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `bank_domains_url_key`(`url`),
    INDEX `bank_domains_bank_id_idx`(`bank_id`),
    INDEX `bank_domains_url_idx`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_configs` ADD CONSTRAINT `bank_configs_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agents` ADD CONSTRAINT `agents_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_logs` ADD CONSTRAINT `transaction_logs_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_logs` ADD CONSTRAINT `transaction_logs_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refill_events` ADD CONSTRAINT `refill_events_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refill_events` ADD CONSTRAINT `refill_events_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_atms` ADD CONSTRAINT `bank_atms_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_float_snapshots` ADD CONSTRAINT `agent_float_snapshots_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_reservations` ADD CONSTRAINT `otp_reservations_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_reservations` ADD CONSTRAINT `otp_reservations_atm_id_fkey` FOREIGN KEY (`atm_id`) REFERENCES `bank_atms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smart_pull_queue` ADD CONSTRAINT `smart_pull_queue_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `smart_pull_queue` ADD CONSTRAINT `smart_pull_queue_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atm_feedback` ADD CONSTRAINT `atm_feedback_otp_id_fkey` FOREIGN KEY (`otp_id`) REFERENCES `otp_reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atm_feedback` ADD CONSTRAINT `atm_feedback_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atm_feedback` ADD CONSTRAINT `atm_feedback_atm_id_fkey` FOREIGN KEY (`atm_id`) REFERENCES `bank_atms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_domains` ADD CONSTRAINT `bank_domains_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
