-- CSS Organization Management System - fresh XAMPP/MariaDB setup
CREATE DATABASE IF NOT EXISTS css_org_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE css_org_db;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin','Governor','Secretary','Treasurer','Member') NOT NULL DEFAULT 'Member',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS members (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  year_section VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_members_name (full_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS officers (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  member_id INT NULL,
  position VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  contact VARCHAR(30) NOT NULL,
  profile_image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_officers_name (full_name),
  INDEX idx_officers_member (member_id),
  CONSTRAINT fk_officers_member FOREIGN KEY (member_id) REFERENCES members(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(30) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  total INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Create a dedicated local application account. Change this password before use.
CREATE USER IF NOT EXISTS 'css_org_app'@'localhost' IDENTIFIED BY 'CHANGE_ME';
CREATE USER IF NOT EXISTS 'css_org_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME';
GRANT SELECT, INSERT, UPDATE, DELETE ON css_org_db.* TO 'css_org_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON css_org_db.* TO 'css_org_app'@'127.0.0.1';
FLUSH PRIVILEGES;
