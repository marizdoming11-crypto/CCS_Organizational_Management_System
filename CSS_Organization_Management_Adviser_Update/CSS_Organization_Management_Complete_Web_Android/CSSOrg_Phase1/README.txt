CSS ORGANIZATION MANAGEMENT SYSTEM
Complete Web + Android + API Project
=====================================

PROJECT CONTENTS
----------------
Backend/                 ASP.NET Core Web API (.NET 10)
WebUI/                   Responsive HTML/CSS/JavaScript web application
Android/CSSOrg.Mobile/   .NET MAUI Android application (C#)
Database/                XAMPP MySQL/MariaDB SQL scripts
Documentation/           Setup, roles, accessibility and testing notes

PLATFORMS
---------
1. Web application
2. Android application
There is no Windows Forms application in this version.

TECHNOLOGY
----------
Backend: ASP.NET Core Web API (.NET 10)
Database: MySQL/MariaDB from XAMPP
Web: HTML, CSS, JavaScript
Android: .NET MAUI, C#
Authentication: JWT
Password hashing: ASP.NET Core PasswordHasher
Voice: Web Speech API and .NET MAUI CommunityToolkit SpeechToText
Text-to-speech: Browser SpeechSynthesis and MAUI TextToSpeech

IMPORTANT PROJECT STATUS
------------------------
This package is a consolidated implementation and development baseline.
The Web UI, API routes, database scripts and MAUI Android source are included.
The source package has not been built on your computer and has not been
end-to-end tested against your XAMPP installation. Build and test locally
before using it with real organization records. Android requires the .NET
MAUI Android workload and an Android SDK.

A. INSTALL REQUIRED SOFTWARE
----------------------------
1. XAMPP with Apache and MySQL/MariaDB.
2. .NET 10 SDK.
3. Visual Studio 2022/2026 with ASP.NET and .NET MAUI workloads, or VS Code
   plus the .NET MAUI workload and Android SDK.
4. Git (optional).
5. Edge or Chrome for Web UI testing.

B. DATABASE SETUP
-----------------
1. Open XAMPP Control Panel.
2. Start MySQL. Apache is needed for phpMyAdmin.
3. Open http://localhost/phpmyadmin
4. Import Database/css_org_db.sql first.
5. Select css_org_db and import Database/complete_modules_schema.sql.
6. The base SQL creates a local css_org_app database user with password
   CHANGE_ME. Change that password before use.

If the database user was already created, set its password in phpMyAdmin SQL:

ALTER USER 'css_org_app'@'localhost' IDENTIFIED BY 'YOUR_NEW_PASSWORD';
ALTER USER 'css_org_app'@'127.0.0.1' IDENTIFIED BY 'YOUR_NEW_PASSWORD';
FLUSH PRIVILEGES;

If your MariaDB version does not support ALTER USER for one host entry,
create or update that account using phpMyAdmin > User accounts.

C. CONFIGURE BACKEND SECRETS
----------------------------
Open PowerShell in the Backend folder.

Run:
  dotnet user-secrets init
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=127.0.0.1;Port=3306;Database=css_org_db;Uid=css_org_app;Pwd=YOUR_NEW_PASSWORD;"
  dotnet user-secrets set "Jwt:SigningKey" "REPLACE_WITH_A_PRIVATE_RANDOM_SECRET_AT_LEAST_32_BYTES_LONG"

Do not commit real passwords or signing keys to GitHub.

Restore and run the API:
  dotnet restore
  dotnet run --urls "http://0.0.0.0:5151"

Open Swagger:
  http://localhost:5151/swagger

Health check:
  http://localhost:5151/health

D. RUN THE WEB APPLICATION
--------------------------
1. Open the WebUI folder in VS Code.
2. Install the Live Server extension if needed.
3. Right-click WebUI/index.html and choose Open with Live Server.
4. Register a new account. Public registration always creates Member role.
5. Sign in.
6. For local browser access, API CORS allows localhost/127.0.0.1 ports 5500
   and 5501. If Live Server uses another port, add its exact origin to
   Cors:AllowedOrigins in Backend/appsettings.json and restart the API.

The web application starts at index.html. The main dashboard is dashboard.html.
Do not open dashboard.html before logging in.

E. CREATE THE FIRST ADMIN ACCOUNT
---------------------------------
After registering your trusted account, promote it once in phpMyAdmin:

USE css_org_db;
UPDATE users SET role='Admin', is_active=1
WHERE username='YOUR_REGISTERED_USERNAME';

Then sign out and sign in again. The new JWT token contains the Admin role.
Never expose an Admin role selector on public registration.

F. RUN THE ANDROID APPLICATION
------------------------------
1. Open Android/CSSOrg.Mobile/CSSOrg.Mobile.csproj in Visual Studio.
2. Restore NuGet packages.
3. Ensure the .NET MAUI Android workload and Android SDK are installed.
4. Select an Android emulator or connect an Android phone with developer
   options and USB debugging enabled.
5. Run the application.

API ADDRESS:
- Android Emulator: http://10.0.2.2:5151/api
- Physical Android phone: change ApiBase in MainPage.xaml.cs to your PC's
  LAN IPv4 address, e.g. http://192.168.1.20:5151/api

For a physical phone:
- Phone and PC must be on the same Wi-Fi network.
- Run the API with --urls http://0.0.0.0:5151.
- Allow the API port through Windows Firewall for your private network.
- Do not expose the XAMPP MySQL port to the network or internet.
- Local HTTP is for development only. Use HTTPS for production.

G. ROLES AND ACCESS
-------------------
Admin: Full administrative access, user roles and account management.
Governor: Organization oversight, members, officers, events and announcements.
Secretary: Member, attendance, event and announcement administration.
Treasurer: Financial records and finance reports.
Member: View permitted organization information and own account.

Public registration always assigns Member. Admin role assignment is restricted
to the Admin-only User API.

H. MODULES INCLUDED
-------------------
- Login and registration
- User role management and account activation
- Dashboard overview
- Member and officer records
- Events
- Attendance
- Announcements
- Financial records
- Organization profile
- Activity logs
- Reports landing page / print view
- Web voice navigation and text-to-speech
- Web accessibility settings: larger text and high contrast
- Android login, shared API navigation, voice input and text-to-speech

I. VOICE AND ACCESSIBILITY NOTES
--------------------------------
Web voice recognition requires a supported browser and microphone permission.
The browser speech service may require internet and browser language support.
The Web command parser recognizes English and selected Filipino/Bisaya phrases.
The Android sample uses the device speech recognizer and TTS engine. It asks
for microphone permission at runtime.

Accessibility support also includes semantic labels, keyboard-operable web
controls, visible focus states, adjustable text and high contrast. Android
users can use TalkBack, system magnification and display-size settings.
Voice is optional and must not be the only way to operate the system.

J. TROUBLESHOOTING
------------------
API cannot connect to database:
- Confirm XAMPP MySQL is running.
- Confirm database css_org_db exists.
- Verify connection string username/password and port 3306.

Browser CORS error:
- Check the Live Server origin and add it to Cors:AllowedOrigins.
- Restart the API after changing appsettings.json.

401 Unauthorized:
- Sign out and sign in again to obtain a fresh JWT.
- Confirm the Authorization header contains Bearer <token>.

403 Forbidden:
- The logged-in account does not have the required role.
- Verify role in users table, then sign in again.

Android cannot connect:
- Use 10.0.2.2 for Android emulator, not localhost.
- For a physical phone, use PC LAN IPv4 address.
- Run API on 0.0.0.0 and check Windows Firewall.

K. SECURITY AND PRODUCTION
--------------------------
- Do not use the sample CHANGE_ME database password.
- Keep JWT signing keys private.
- Use HTTPS in production.
- Use a managed/hosted database and API for internet deployment.
- Do not expose MySQL directly to the public internet.
- Back up the database.
- Test permissions before entering real student information.
