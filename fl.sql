CREATE TABLE banks (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('active','suspended','onboarding') DEFAULT 'onboarding',
    webhook_url VARCHAR(255),
    webhook_secret VARCHAR(128),
    atm_api_url VARCHAR(255),
    atm_api_key_encrypted VARBINARY(512),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP(6)
) ;

-- 2. Bank Configs (Thresholds, Branding, etc.)
CREATE TABLE bank_configs (
    bank_id VARCHAR(36) PRIMARY KEY,
    threshold_low DECIMAL(5,4) DEFAULT 0.7000, 
    threshold_high DECIMAL(5,4) DEFAULT 1.3000,    
    branding JSON,
    CONSTRAINT fk_bank_config FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE CASCADE
) ;

-- 3. Agents
CREATE TABLE agents (
    id VARCHAR(36) PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    agent_id VARCHAR(50) NOT NULL,                
    terminal_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(150),
    nin VARCHAR(11),
    bvn VARCHAR(11),
    work_location POINT NOT NULL,
    work_address VARCHAR(255),
    assigned_limit DECIMAL(15,2) NOT NULL,
    onboarded_via ENUM('api','manual') NOT NULL,
    status ENUM('active','suspended','fraud','inactive') DEFAULT 'active',
    last_active_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP(6),
    SPATIAL INDEX(work_location),
    INDEX idx_bank_status (bank_id, status),
    INDEX idx_terminal (terminal_id),
    INDEX idx_agent_id_bank (bank_id, agent_id),
    CONSTRAINT fk_agent_bank FOREIGN KEY (bank_id) REFERENCES banks(id)
) ;

CREATE TABLE roles (
    id  INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    bank_id VARCHAR(36),                    
    agent_id VARCHAR(36),            
    role_id  NOT NULL,       
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARBINARY(60),         
    status ENUM('active','suspended','pending') DEFAULT 'pending',
    last_login_at DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_email (email),
    INDEX idx_bank_role (bank_id, role),
    INDEX idx_agent (agent_id),
    CONSTRAINT fk_user_bank FOREIGN KEY (bank_id) REFERENCES banks(id),
    CONSTRAINT fk_user_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE transaction_logs (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_id       VARCHAR(36) NOT NULL,
    agent_id      VARCHAR(36) NOT NULL,
    terminal_id   VARCHAR(50),
    tx_type       ENUM('withdrawal','deposit') NOT NULL,
    amount        DECIMAL(15,2) NOT NULL,
    tx_time       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location_lat  DECIMAL(10,8),
    location_lng  DECIMAL(11,8),
    source        ENUM('webhook','api_pull','manual') DEFAULT 'webhook',

    INDEX idx_bank_time     (bank_id, tx_time DESC),
    INDEX idx_agent_time    (agent_id, tx_time DESC),
    INDEX idx_terminal      (terminal_id),
    INDEX idx_geo           (location_lat, location_lng),

    CONSTRAINT fk_tx_bank   FOREIGN KEY (bank_id)  REFERENCES banks(id),
    CONSTRAINT fk_tx_agent  FOREIGN KEY (agent_id) REFERENCES agents(id)
) 
PARTITION BY RANGE (YEAR(tx_time)) (
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);



CREATE TABLE refill_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id CHAR(36) NOT NULL,
    bank_id CHAR(36) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    source ENUM('atm') DEFAULT 'atm' NOT NULL,
    source_ref VARCHAR(100),  -- 
    refill_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_agent_time (agent_id, refill_at DESC),
    INDEX idx_bank_time (bank_id, refill_at DESC),

    CONSTRAINT fk_refill_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
    CONSTRAINT fk_refill_bank  FOREIGN KEY (bank_id)  REFERENCES banks(id)
);




-- 4. ATM Registry (Per Bank)
CREATE TABLE bank_atms (
    id VARCHAR(36) PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    atm_code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    location POINT NOT NULL,
    address VARCHAR(255),
    float_available DECIMAL(15,2) DEFAULT 0,
    float_reserved DECIMAL(15,2) DEFAULT 0,
    last_sync_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    SPATIAL INDEX(location),
    INDEX idx_bank_float (bank_id, float_available),
    INDEX idx_bank_code (bank_id, atm_code),
    CONSTRAINT fk_atm_bank FOREIGN KEY (bank_id) REFERENCES banks(id)
) 
PARTITION BY HASH(bank_id) PARTITIONS 16;

-- 5. Agent Float Snapshots (Hot Path)
CREATE TABLE agent_float_snapshots (
    agent_id VARCHAR(36) PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    e_float DECIMAL(15,2) NOT NULL,
    cash_in_hand DECIMAL(15,2) DEFAULT 0,
    source ENUM('webhook','pull','fallback') NOT NULL,
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    staleness_score TINYINT DEFAULT 0,  -- 0 = fresh, 1 = 5min, 2 = 15min+
    INDEX idx_bank_float (bank_id, e_float),
    INDEX idx_stale (staleness_score, last_updated_at),
    CONSTRAINT fk_snap_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ;

-- 6. OTP Reservations (30-min Expiry)
CREATE TABLE otp_reservations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(36) NOT NULL,
    bank_id VARCHAR(36) NOT NULL,
    atm_id VARCHAR(36) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    amount_needed DECIMAL(15,2) NOT NULL,
    amount_reserved DECIMAL(15,2) NOT NULL,
    status ENUM('issued','used','expired','failed') DEFAULT 'issued',
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    expires_at DATETIME GENERATED ALWAYS AS (issued_at + INTERVAL 30 MINUTE) STORED,
    used_at DATETIME,
    INDEX idx_otp_code (otp_code),
    INDEX idx_agent_status (agent_id, status),
    INDEX idx_expiry (expires_at),
    INDEX idx_atm (atm_id),
    CONSTRAINT fk_otp_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
    CONSTRAINT fk_otp_atm FOREIGN KEY (atm_id) REFERENCES bank_atms(id)
) ;

-- 7. ATM Feedback Log (Close the Loop)
CREATE TABLE atm_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    otp_id BIGINT NOT NULL,
    agent_id VARCHAR(36) NOT NULL,
    atm_id VARCHAR(36) NOT NULL,
    event ENUM('withdrawal_success','withdrawal_failed','code_invalid') NOT NULL,
    amount_dispensed DECIMAL(15,2),
    event_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    raw_payload JSON,
    INDEX idx_otp (otp_id),
    INDEX idx_agent (agent_id),
    CONSTRAINT fk_feedback_otp FOREIGN KEY (otp_id) REFERENCES otp_reservations(id)
) ;

-- 8. Smart Pull Queue (For Non-Webhook Banks)
CREATE TABLE smart_pull_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    agent_id VARCHAR(36) NOT NULL,
    priority TINYINT DEFAULT 1,  -- 0 = critical (near threshold), 1 = active
    last_pulled_at DATETIME,
    pull_after DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    status ENUM('pending','in_progress','completed','failed') DEFAULT 'pending',
    INDEX idx_bank_priority (bank_id, priority, pull_after),
    INDEX idx_agent (agent_id),
    UNIQUE KEY uq_bank_agent (bank_id, agent_id),
    CONSTRAINT fk_pull_bank FOREIGN KEY (bank_id) REFERENCES banks(id),
    CONSTRAINT fk_pull_agent FOREIGN KEY (agent_id) REFERENCES agents(id)
) ;

-- 9. Webhook Delivery Log (Reliability)
CREATE TABLE webhook_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,  -- SHA-256
    status ENUM('received','processed','failed','retry') DEFAULT 'received',
    attempt_count TINYINT DEFAULT 1,
    last_attempt_at DATETIME,
    next_retry_at DATETIME,
    error_message TEXT,
    INDEX idx_event (bank_id, event_id),
    INDEX idx_retry (status, next_retry_at),
    UNIQUE KEY uq_event (bank_id, event_id)
) ;

-- 10. Audit Log (CBN-Compliant, Immutable)
CREATE TABLE audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bank_id VARCHAR(36) NOT NULL,
    agent_id VARCHAR(36),
    event_type VARCHAR(50) NOT NULL,  -- 'otp_issued', 'threshold_alert', 'webhook_received'
    event_data JSON NOT NULL,
    actor_type ENUM('system','bank_admin','agent') NOT NULL,
    actor_id VARCHAR(100),
    ip_address VARBINARY(16),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_bank_event (bank_id, event_type, created_at),
    INDEX idx_agent (agent_id)
) 
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);