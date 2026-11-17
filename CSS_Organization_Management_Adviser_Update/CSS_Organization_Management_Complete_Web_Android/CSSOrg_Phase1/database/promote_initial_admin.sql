-- Run this only once after you have registered your own account.
-- Replace YOUR_REGISTERED_USERNAME with the exact username you registered.
-- Execute in phpMyAdmin > css_org_db > SQL.
-- Never promote an account you do not control.

UPDATE users
SET role = 'Admin', is_active = 1
WHERE username = 'YOUR_REGISTERED_USERNAME';

-- Verify the result:
SELECT id, username, role, is_active
FROM users
WHERE username = 'YOUR_REGISTERED_USERNAME';
