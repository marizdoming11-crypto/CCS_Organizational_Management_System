-- Run this only if css_org_db already exists and its users table has no role/is_active columns.
USE css_org_db;
ALTER TABLE users ADD COLUMN role ENUM('Admin','Governor','Secretary','Treasurer','Member') NOT NULL DEFAULT 'Member';
ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;
