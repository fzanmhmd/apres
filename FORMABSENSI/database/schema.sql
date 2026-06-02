CREATE DATABASE IF NOT EXISTS datakaryawan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE datakaryawan;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nik VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(120) NULL,
  role ENUM('employee', 'admin') NOT NULL DEFAULT 'employee',
  face_template JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  device_uuid VARCHAR(80) NOT NULL,
  fingerprint_hash VARCHAR(128) NOT NULL,
  label VARCHAR(120) NULL,
  is_bound TINYINT(1) NOT NULL DEFAULT 1,
  bound_at DATETIME NULL,
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_device (user_id, device_uuid),
  KEY idx_device_uuid (device_uuid),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS geofences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_m INT UNSIGNED NOT NULL DEFAULT 250,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  device_id BIGINT UNSIGNED NULL,
  attendance_type ENUM('Masuk', 'Keluar') NOT NULL,
  shift_name ENUM('Pagi', 'Siang', 'Malam') NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_time TIME NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  distance_m INT UNSIGNED NULL,
  geofence_status ENUM('inside', 'outside', 'unknown') NOT NULL DEFAULT 'unknown',
  face_score DECIMAL(5,2) NULL,
  liveness_status ENUM('valid', 'failed', 'skipped') NOT NULL DEFAULT 'skipped',
  face_snapshot_base64 MEDIUMTEXT NULL,
  note TEXT NULL,
  status ENUM('Valid', 'Review', 'Rejected') NOT NULL DEFAULT 'Valid',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_user_date_type (user_id, attendance_date, attendance_type),
  KEY idx_attendance_user_date (user_id, attendance_date),
  KEY idx_attendance_type (attendance_type),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  active_shift ENUM('Pagi', 'Siang', 'Malam') NOT NULL DEFAULT 'Pagi',
  pagi_time TIME NOT NULL DEFAULT '08:00:00',
  siang_time TIME NOT NULL DEFAULT '13:30:00',
  malam_time TIME NOT NULL DEFAULT '21:00:00',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_work_schedules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  metadata JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user_created (user_id, created_at),
  KEY idx_audit_type (event_type),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO geofences (name, latitude, longitude, radius_m)
SELECT 'Kantor PT.MARKOJAN', -6.2087630, 106.8455990, 250
WHERE NOT EXISTS (SELECT 1 FROM geofences WHERE name = 'Kantor PT.MARKOJAN');

-- Buat user awal lewat PHP agar hash password aman:
-- php -r "echo password_hash('password-anda', PASSWORD_DEFAULT), PHP_EOL;"
-- INSERT INTO users (nik, full_name, password_hash, department, role)
-- VALUES ('MP-001', 'Admin PT.MARKOJAN', '$2y$10$ganti_dengan_hash_php', 'HR', 'admin');
--
-- Gunakan role 'admin' hanya untuk 1 orang pengelola lokasi kantor.
-- User lain sebaiknya memakai role 'employee'.
