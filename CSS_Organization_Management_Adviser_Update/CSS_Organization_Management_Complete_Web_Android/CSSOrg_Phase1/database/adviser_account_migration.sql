-- Run once in phpMyAdmin after selecting css_org_db.
-- Adds registration profile fields and promotes the designated CSS Adviser account.
USE css_org_db;

ALTER TABLE users
  ADD COLUMN email VARCHAR(150) NULL AFTER username,
  ADD COLUMN first_name VARCHAR(100) NULL AFTER email,
  ADD COLUMN middle_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER middle_name;

-- For older installations that used an email address as the username,
-- copy it into the new email column so the designated account can sign in.
UPDATE users SET email = username WHERE email IS NULL AND username LIKE '%@%';
UPDATE users SET role = 'Admin' WHERE LOWER(email) = 'rowenraz@gmail.com';

ALTER TABLE users ADD UNIQUE KEY uq_users_email (email);
