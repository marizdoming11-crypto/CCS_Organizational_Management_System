-- CSS Organization Management System: complete module schema
-- Import this AFTER the original css_org_db.sql in phpMyAdmin.
USE css_org_db;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  event_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  location VARCHAR(255) NULL,
  status ENUM('Draft','Published','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_events_date (event_date),
  CONSTRAINT fk_events_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NULL,
  member_id INT NULL,
  member_name VARCHAR(150) NOT NULL,
  attendance_status ENUM('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
  remarks VARCHAR(500) NULL,
  attendance_date DATE NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_member (member_id),
  CONSTRAINT fk_attendance_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
  CONSTRAINT fk_attendance_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  content TEXT NOT NULL,
  audience ENUM('All','Officers','Members') NOT NULL DEFAULT 'All',
  publish_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Draft','Published','Archived') NOT NULL DEFAULT 'Published',
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_announcements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_announcements_publish (publish_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_type ENUM('Income','Expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  reference_no VARCHAR(100) NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_finance_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_finance_date (transaction_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username VARCHAR(100) NOT NULL,
  action VARCHAR(180) NOT NULL,
  module VARCHAR(80) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created (created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organization_profile (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_name VARCHAR(180) NOT NULL DEFAULT 'Computer Studies Society',
  school_name VARCHAR(180) NULL,
  academic_year VARCHAR(30) NULL,
  semester VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  contact VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  mission TEXT NULL,
  vision TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO organization_profile (organization_name)
SELECT 'Computer Studies Society'
WHERE NOT EXISTS (SELECT 1 FROM organization_profile);
