-- ============================================================
-- Clinic Booking System — Database Schema
-- Engine: MySQL 8.x
-- ============================================================

CREATE DATABASE IF NOT EXISTS clinic_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinic_booking;

-- ------------------------------------------------------------
-- Table: doctors
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100)  NOT NULL,
  specialty     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  phone         VARCHAR(20)   NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: patients
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  phone         VARCHAR(20)   NULL,
  date_of_birth DATE          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: appointments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT          NOT NULL,
  doctor_id        INT          NOT NULL,
  appointment_date DATETIME     NOT NULL,
  status           ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  notes            VARCHAR(500) NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_appt_date (appointment_date),
  INDEX idx_appt_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed data (optional — useful for manual QA)
-- ------------------------------------------------------------
INSERT INTO doctors (full_name, specialty, email, phone) VALUES
  ('Dr. Amara Chen', 'General Practice', 'amara.chen@clinic.test', '555-0101'),
  ('Dr. Luis Fernandez', 'Pediatrics', 'luis.fernandez@clinic.test', '555-0102'),
  ('Dr. Priya Nair', 'Dermatology', 'priya.nair@clinic.test', '555-0103');

INSERT INTO patients (full_name, email, phone, date_of_birth) VALUES
  ('John Okafor', 'john.okafor@mail.test', '555-0201', '1990-04-12'),
  ('Maria Santos', 'maria.santos@mail.test', '555-0202', '1985-11-03'),
  ('Wei Zhang', 'wei.zhang@mail.test', '555-0203', '2001-07-22');

INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES
  (1, 1, '2026-12-01 09:00:00', 'scheduled', 'Annual check-up'),
  (2, 2, '2026-12-02 10:30:00', 'scheduled', 'Follow-up visit'),
  (3, 3, '2026-11-20 14:00:00', 'completed', 'Skin consultation');
