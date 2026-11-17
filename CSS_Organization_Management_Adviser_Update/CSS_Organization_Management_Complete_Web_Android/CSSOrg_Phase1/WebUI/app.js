const API_BASE = localStorage.getItem("CSS_API_BASE") || "http://localhost:5151/api";
const API = API_BASE;

const MODULES = {
  members: {
    title: "Members",
    endpoint: "members",
    roles: ["Adviser"],
    fields: [
      ["first_name", "First name", "text"],
      ["middle_name", "Middle name", "text"],
      ["last_name", "Last name", "text"],
      ["year_section", "Year & section", "text"],
      ["address", "Address", "text"],
      ["contact", "Contact number", "text"]
    ]
  },
  officers: {
    title: "Officers",
    endpoint: "officers",
    roles: ["Adviser"],
    fields: [
      ["full_name", "Full name", "text"],
      ["member_id", "Member ID", "number"],
      ["position", "Position", "text"],
      ["email", "Email", "email"],
      ["contact", "Contact number", "text"],
      ["profile_image", "Profile image path (optional)", "text"]
    ]
  },
  attendance: {
    title: "Attendance",
    endpoint: "attendance",
    roles: ["Adviser"],
    fields: [
      ["member_name", "Member name", "text"],
      ["attendance_status", "Status", "select:Present,Absent,Late,Excused"],
      ["remarks", "Remarks", "textarea"],
      ["attendance_date", "Attendance date", "date"]
    ]
  },
  events: {
    title: "Events",
    endpoint: "events",
    roles: ["Adviser"],
    fields: [
      ["title", "Event title", "text"],
      ["description", "Description", "textarea"],
      ["event_date", "Event date", "date"],
      ["start_time", "Start time", "time"],
      ["end_time", "End time", "time"],
      ["location", "Location", "text"],
      ["status", "Status", "select:Draft,Published,Completed,Cancelled"]
    ]
  },
  finance: {
    title: "Membership Fees",
    endpoint: "finance",
    roles: ["Adviser"],
    fields: [
      ["record_type", "Type", "select:Income,Expense"],
      ["category", "Category", "text"],
      ["description", "Description", "text"],
      ["amount", "Amount", "number"],
      ["transaction_date", "Transaction date", "date"],
      ["reference_no", "Reference number", "text"]
    ]
  },
  "activity-logs": {
    title: "Activity Logs",
    endpoint: "activity-logs",
    roles: ["Adviser"],
    fields: []
  }
};

let currentPage = "dashboard";
let editingId = null;
let voiceRecognition = null;
let loginRecognition = null;

// =========================================
// AUTHENTICATION AND API HELPERS
// =========================================

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("css_user") || "null");
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem("css_token") || "";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.info(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (getToken()) {
    headers.set("Authorization", `Bearer ${getToken()}`);
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers
  });

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("css_token");
      localStorage.removeItem("css_user");
    }

    throw new Error(
      data?.message ||
      data?.title ||
      (typeof data === "string" && data) ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function requireAuth() {
  if (!getToken() || !getUser()) {
    location.href = "index.html";
    return false;
  }

  return true;
}

function canSeeRoles(button) {
  const roles = (button.dataset.roles || "")
    .split(",")
    .filter(Boolean);

  return !roles.length || roles.includes(getUser()?.role);
}

// =========================================
// LOGIN AND REGISTRATION
// =========================================

function initAuthPage() {
  const login = document.getElementById("loginForm");
  const registration = document.getElementById("registerForm");

  if (login) {
    initLoginVoice();

    login.addEventListener("submit", async event => {
      event.preventDefault();

      const message = document.getElementById("authMessage");
      const username = document.getElementById("username")?.value.trim() || "";
      const password = document.getElementById("password")?.value || "";

      if (message) {
        message.textContent = "Signing in...";
      }

      try {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password })
        });

        if (!data?.token || !data?.user) {
          throw new Error("The server response did not contain a valid login token and user.");
        }

        localStorage.setItem("css_token", data.token);
        localStorage.setItem("css_user", JSON.stringify(data.user));

        if (message) {
          message.textContent = "Login successful. Opening dashboard.";
        }

        location.href = "dashboard.html";
      } catch (error) {
        if (message) {
          message.textContent = "Login failed. " + error.message;
        }

        speakLogin("Login failed. " + error.message);
      }
    });
  }

  if (registration) {
    registration.addEventListener("submit", async event => {
      event.preventDefault();

      const message = document.getElementById("authMessage");
      const password = document.getElementById("password")?.value || "";
      const confirmPassword =
        document.getElementById("confirmPassword")?.value || "";

      if (password !== confirmPassword) {
        if (message) message.textContent = "Passwords do not match.";
        return;
      }

      if (message) message.textContent = "Creating account...";

      try {
        const data = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            firstName: document.getElementById("firstName")?.value.trim() || "",
            middleName: document.getElementById("middleName")?.value.trim() || "",
            lastName: document.getElementById("lastName")?.value.trim() || "",
            email: document.getElementById("email")?.value.trim() || "",
            username: document.getElementById("username")?.value.trim() || "",
            password
          })
        });

        if (message) {
          message.textContent =
            data?.message || "Registration successful.";
        }

        window.setTimeout(() => {
          location.href = "index.html";
        }, 1200);
      } catch (error) {
        if (message) message.textContent = error.message;
      }
    });
  }
}

// =========================================
// LOGIN TEXT-TO-SPEECH
// =========================================

function speakLogin(message, force = false) {
  // Login announcements are on-demand. Only an explicit Repeat Instructions
  // action may speak while the global hover/focus assistant is turned off.
  if (!force && localStorage.getItem("a11y_hoverVoiceEnabled") !== "true") return;

  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-PH";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function playLoginInstructions() {
  const instructions =
    "Welcome to the CSS Organization Management System. " +
    "You are on the sign in page. " +
    "First, enter your registered username or email address. " +
    "Next, enter your password. " +
    "Your password will never be spoken aloud. " +
    "Finally, activate the Sign in button to access your account. " +
    "You can navigate using your keyboard or screen reader. " +
    "Activate Repeat instructions if you need to hear this guidance again.";

  speakLogin(instructions, true);
}

// =========================================
// LOGIN VOICE ASSISTANCE
// =========================================

function initLoginVoice() {
  const guideButton = document.getElementById("voiceGuideBtn");
  const commandButton = document.getElementById("voiceCommandBtn");
  const status = document.getElementById("voiceStatus");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) return;

  // No automatic speech on page load. Hover/focus speech is handled by the
  // global on-demand assistant and is disabled until the user activates it.
  if (guideButton) {
    guideButton.addEventListener("click", () => {
      if (status) status.textContent = "Reading login instructions.";
      playLoginInstructions();
    });
  }

  if (!commandButton) return;

  commandButton.addEventListener("click", () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const message =
        "Voice recognition is not supported in this browser. " +
        "Please use your screen reader or keyboard.";

      if (status) status.textContent = message;
      speakLogin(message);
      return;
    }

    // Prevent overlapping microphone sessions.
    if (loginRecognition) {
      try {
        loginRecognition.stop();
      } catch {
        // Ignore if the recognition session has already stopped.
      }
    }

    loginRecognition = new SpeechRecognition();
    loginRecognition.lang = "en-PH";
    loginRecognition.interimResults = false;
    loginRecognition.maxAlternatives = 1;

    if (status) {
      status.textContent =
        "Listening. Say help, username, password, or sign in.";
    }

    loginRecognition.onresult = event => {
      const command = event.results[0][0].transcript
        .toLowerCase()
        .trim();

      console.log("Login voice command:", command);

      if (
        command.includes("help") ||
        command.includes("instruction")
      ) {
        if (status) status.textContent = "Reading login instructions.";
        playLoginInstructions();
      } else if (
        command.includes("username") ||
        command.includes("email")
      ) {
        username?.focus();
      } else if (command.includes("password")) {
        password?.focus();
      } else if (
        command.includes("sign in") ||
        command.includes("login")
      ) {
        if (loginForm.checkValidity()) {
          if (status) status.textContent = "Submitting login form.";
          loginForm.requestSubmit();
        } else {
          loginForm.reportValidity();

          const message =
            "Please complete the required username and password fields first.";

          if (status) status.textContent = message;
          speakLogin(message);
        }
      } else {
        const message =
          "Command not recognized. Try saying help, username, password, or sign in.";

        if (status) status.textContent = message;
        speakLogin(message);
      }
    };

    loginRecognition.onerror = event => {
      const message = "Voice recognition error: " + event.error;

      if (status) status.textContent = message;
      console.error(message);
    };

    loginRecognition.onend = () => {
      console.log("Login voice recognition ended.");
      loginRecognition = null;
    };

    try {
      loginRecognition.start();
    } catch (error) {
      if (status) {
        status.textContent =
          "Unable to start voice recognition. Please try again.";
      }

      console.error(error);
      loginRecognition = null;
    }
  });
}

// =========================================
// DASHBOARD INITIALIZATION
// =========================================

function initDashboard() {
  if (!requireAuth()) return;

  const user = getUser();

  const userLabel = document.getElementById("userLabel");
  const roleBadge = document.getElementById("roleBadge");
  const logoutButton = document.getElementById("logoutBtn");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");

  if (userLabel) userLabel.textContent = user?.username || "User";
  if (roleBadge) roleBadge.textContent = user?.role || "Member";

  document.querySelectorAll("#mainNav [data-page]").forEach(button => {
    button.hidden = !canSeeRoles(button);

    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });
  });

  logoutButton?.addEventListener("click", logout);

  menuToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate(button.dataset.page);
      }
    });
  });

  navigate("dashboard");
}

function logout() {
  localStorage.removeItem("css_token");
  localStorage.removeItem("css_user");
  location.href = "index.html";
}

function navigate(page) {
  currentPage = page;
  editingId = null;

  const button = document.querySelector(
    `#mainNav [data-page="${page}"]`
  );

  if (button?.hidden) {
    showToast("You do not have permission to open this module.");
    return;
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  const pageTitle = document.getElementById("pageTitle");

  if (pageTitle) {
    pageTitle.textContent =
      page === "dashboard"
        ? "Dashboard"
        : (
            MODULES[page]?.title ||
            {
              users: "User Management",
              reports: "Reports",
            }[page] ||
            page
          );
  }

  // Announce the new page after its content has had a chance to render.
  // This runs only when the user has explicitly enabled voice assistance.
  const currentTitle = pageTitle?.textContent?.trim() || MODULES[page]?.title || page;
  window.setTimeout(() => {
    speakOnDemand(`You are now on the ${currentTitle} page.`);
  }, 150);

  document.getElementById("sidebar")?.classList.remove("open");

  if (page === "dashboard") {
    renderDashboard();
  } else if (page === "users") {
    renderUsers();
  } else if (page === "reports") {
    renderReports();
  } else if (page === "attendance") {
    renderAttendance();
  } else if (MODULES[page]) {
    renderModule(page);
  }
}

// =========================================
// DASHBOARD
// =========================================

async function renderDashboard() {
  const container = document.getElementById("pageContent");
  if (!container) return;

  const user = getUser();
  const displayName = user?.fullName || user?.username || "User";
  const today = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date());



  container.innerHTML = `
    <section class="dashboard-welcome">
      <div class="dashboard-welcome-copy">
        <span class="dashboard-kicker">CYBER SMART SOCIETY</span>
        <h2>Welcome back, ${escapeHtml(displayName)}!</h2>
        <p>Your organization workspace is ready. Here's your latest overview.</p>
        <span class="dashboard-date">📅 ${escapeHtml(today)}</span>
      </div>
      <div class="dashboard-welcome-art" aria-hidden="true">
        <div class="dashboard-art-orbit dashboard-art-orbit-one"></div>
        <div class="dashboard-art-orbit dashboard-art-orbit-two"></div>
        <div class="dashboard-art-icon">✦</div>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="dashboard-section-heading">
        <div>
          <span class="dashboard-kicker">AT A GLANCE</span>
          <h3>Organization Overview</h3>
        </div>
        <span class="dashboard-live-label"><i></i> Live summary</span>
      </div>
      <div class="dashboard-stats-grid" id="stats" aria-live="polite">
        <div class="dashboard-stat-card dashboard-stat-loading">Loading organization overview...</div>
      </div>
    </section>

    <section class="dashboard-section dashboard-insights-section">
      <div class="dashboard-section-heading">
        <div>
          <span class="dashboard-kicker">RECENT UPDATES</span>
          <h3>Organization Activity</h3>
          <p>A quick look at recent events and recorded updates.</p>
        </div>
      </div>
      <div class="dashboard-insights-grid">
        <article class="dashboard-insight-panel">
          <div class="dashboard-insight-title">
            <span class="dashboard-insight-icon events">📅</span>
            <div><strong>Recent Events</strong><small>Latest organization activities</small></div>
          </div>
          <div id="dashboardRecentEvents" class="dashboard-insight-list">
            <p class="dashboard-insight-loading">Loading events...</p>
          </div>
        </article>
        <article class="dashboard-insight-panel">
          <div class="dashboard-insight-title">
            <span class="dashboard-insight-icon updates">✦</span>
            <div><strong>Latest Updates</strong><small>Recent system activity</small></div>
          </div>
          <div id="dashboardLatestUpdates" class="dashboard-insight-list">
            <p class="dashboard-insight-loading">Loading updates...</p>
          </div>
        </article>
      </div>
    </section>
  `;

  loadDashboardInsights();

  try {
    const data = await apiFetch("/workspace/summary");
    const stats = document.getElementById("stats");
    if (!stats) return;

    const cards = [
      { label: "Total Members", value: data.members, icon: "👥", tone: "blue", note: "Registered members" },
      { label: "Officers", value: data.officers, icon: "🎖️", tone: "violet", note: "Organization leaders" },
      { label: "Events", value: data.events, icon: "📅", tone: "orange", note: "Recorded activities" },
      { label: "Attendance", value: data.attendance, icon: "📋", tone: "green", note: "Attendance records" },
      { label: "Fee Records", value: data.finance, icon: "₱", tone: "teal", note: "Income and expenses" }
    ];

    stats.innerHTML = cards.map(card => `
      <article class="dashboard-stat-card">
        <div class="dashboard-stat-top">
          <span class="dashboard-stat-icon ${card.tone}">${card.icon}</span>
          <span class="dashboard-stat-label">${escapeHtml(card.label)}</span>
        </div>
        <strong class="dashboard-stat-value">${Number(card.value ?? 0).toLocaleString("en-PH")}</strong>
        <small>${escapeHtml(card.note)}</small>
      </article>
    `).join("");
  } catch (error) {
    const stats = document.getElementById("stats");
    if (stats) {
      stats.innerHTML = `
        <div class="dashboard-stat-error">
          <strong>Overview unavailable</strong>
          <span>${escapeHtml(error.message)}</span>
          <button class="secondary-btn" type="button" id="retryDashboardStats">Try again</button>
        </div>
      `;
      document.getElementById("retryDashboardStats")?.addEventListener("click", renderDashboard);
    }
  }
}

async function loadDashboardInsights() {
  const eventsHost = document.getElementById("dashboardRecentEvents");
  const updatesHost = document.getElementById("dashboardLatestUpdates");
  if (!eventsHost || !updatesHost) return;

  const pick = (item, names) => {
    for (const name of names) {
      const key = Object.keys(item || {}).find(k => k.toLowerCase() === name.toLowerCase());
      if (key && item[key] !== null && item[key] !== undefined && item[key] !== "") return item[key];
    }
    return "";
  };
  const formatDate = value => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
  };

  const [eventsResult, logsResult] = await Promise.allSettled([
    apiFetch("/workspace/events"),
    apiFetch("/workspace/activity-logs")
  ]);

  if (eventsResult.status === "fulfilled") {
    const events = Array.isArray(eventsResult.value) ? eventsResult.value : [];
    events.sort((a, b) => new Date(pick(b, ["event_date", "date", "created_at"])) - new Date(pick(a, ["event_date", "date", "created_at"])));
    const latest = events.slice(0, 4);
    eventsHost.innerHTML = latest.length ? latest.map(event => {
      const title = pick(event, ["title", "event_title", "name"]) || "Organization event";
      const date = formatDate(pick(event, ["event_date", "date", "created_at"]));
      const status = pick(event, ["status"]);
      return `<div class="dashboard-insight-item"><span class="dashboard-insight-dot"></span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml([date, status].filter(Boolean).join(" · ") || "Event record")}</small></div></div>`;
    }).join("") : '<p class="dashboard-insight-empty">No events have been recorded yet.</p>';
  } else {
    eventsHost.innerHTML = '<p class="dashboard-insight-empty">Event information is currently unavailable.</p>';
  }

  if (logsResult.status === "fulfilled") {
    const logs = Array.isArray(logsResult.value) ? logsResult.value : [];
    logs.sort((a, b) => new Date(pick(b, ["created_at", "createdAt", "date", "timestamp"])) - new Date(pick(a, ["created_at", "createdAt", "date", "timestamp"])));
    const latest = logs.slice(0, 4);
    updatesHost.innerHTML = latest.length ? latest.map(log => {
      const description = pick(log, ["details", "action", "description"]) || "A system update was recorded";
      const module = pick(log, ["module"]);
      const date = formatDate(pick(log, ["created_at", "createdAt", "date", "timestamp"]));
      return `<div class="dashboard-insight-item"><span class="dashboard-insight-dot update"></span><div><strong>${escapeHtml(description)}</strong><small>${escapeHtml([module, date].filter(Boolean).join(" · ") || "Activity log")}</small></div></div>`;
    }).join("") : '<p class="dashboard-insight-empty">No recent system updates are available.</p>';
  } else {
    updatesHost.innerHTML = '<p class="dashboard-insight-empty">Activity updates are currently unavailable.</p>';
  }
}

// =========================================
 // EVENT-BASED OFFICER ATTENDANCE
 // =========================================

let attendanceOfficers = [];
let attendanceEvents = [];
let attendanceRecords = [];

function getOfficerMemberId(officer) {
  return Number(
    officer.member_id ?? officer.memberId ??
    officer.MemberId ?? officer.memberID ?? 0
  );
}

function getOfficerDisplayName(officer) {
  return String(
    officer.full_name ?? officer.fullName ??
    officer.member_name ?? officer.memberName ??
    officer.name ?? ""
  ).trim();
}

async function renderAttendance() {
  const container = document.getElementById("pageContent");
  if (!container) return;

  container.innerHTML = `
    <div class="hero">
      <h2>Attendance</h2>
      <p>Select an event, then mark the attendance of each officer.</p>
    </div>
    <div class="panel">
      <div class="form-grid">
        <div class="field">
          <label for="attendanceEvent">Select event</label>
          <select id="attendanceEvent" required>
            <option value="">Loading events...</option>
          </select>
        </div>
        <div class="field">
          <label for="attendanceDate">Attendance date</label>
          <input id="attendanceDate" type="date" value="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10)}" required>
        </div>
      </div>
      <div class="toolbar">
        <span id="attendanceEventInfo" aria-live="polite">Choose an event to record attendance.</span>
        <button class="secondary-btn" id="refreshAttendance" type="button">Refresh officers</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Present</th><th>Officer name</th><th>Position</th><th>Remarks</th></tr></thead>
          <tbody id="attendanceOfficerList">
            <tr><td colspan="4">Loading officers...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="form-actions">
        <button class="primary-btn" id="saveAttendanceBtn" type="button" disabled>Save attendance</button>
      </div>
    </div>
  `;

  const eventSelect = document.getElementById("attendanceEvent");
  const refreshButton = document.getElementById("refreshAttendance");
  const saveButton = document.getElementById("saveAttendanceBtn");

  eventSelect.addEventListener("change", loadAttendanceForSelectedEvent);
  refreshButton.addEventListener("click", loadAttendanceChoices);
  saveButton.addEventListener("click", saveAttendanceSheet);

  await loadAttendanceChoices();
}

async function loadAttendanceChoices() {
  const eventSelect = document.getElementById("attendanceEvent");
  const list = document.getElementById("attendanceOfficerList");
  const info = document.getElementById("attendanceEventInfo");
  if (!eventSelect || !list) return;

  list.innerHTML = '<tr><td colspan="4">Loading officers...</td></tr>';
  try {
    const [eventsResult, officersResult] = await Promise.all([
      apiFetch("/workspace/events"),
      apiFetch("/Officer/all")
    ]);

    attendanceEvents = Array.isArray(eventsResult) ? eventsResult : [];
    attendanceOfficers = (Array.isArray(officersResult) ? officersResult : [])
      .filter(officer => getOfficerMemberId(officer) > 0 && getOfficerDisplayName(officer));

    const previousEvent = eventSelect.value;
eventSelect.innerHTML = '<option value="">Choose an event</option>' +
  attendanceEvents.map(event => {
    const eventId = Number(event.id ?? event.event_id ?? event.eventId ?? 0);
    const title = event.title ?? event.event_name ?? event.eventName ?? `Event #${eventId}`;

    return `<option value="${eventId}">${escapeHtml(title)}</option>`;
  }).join("");

    if (attendanceEvents.some(event => Number(event.id ?? event.event_id ?? event.eventId) === Number(previousEvent))) {
      eventSelect.value = previousEvent;
    }

    if (!attendanceOfficers.length) {
      list.innerHTML = '<tr><td colspan="4" class="empty">No officers are available. Add officers first.</td></tr>';
    } else {
      renderAttendanceOfficerRows([]);
    }

    if (info) info.textContent = `${attendanceOfficers.length} officer(s) loaded.`;
    document.getElementById("saveAttendanceBtn").disabled = !eventSelect.value || !attendanceOfficers.length;

    if (eventSelect.value) await loadAttendanceForSelectedEvent();
  } catch (error) {
    list.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    showToast(`Unable to load attendance data: ${error.message}`);
  }
}

async function loadAttendanceForSelectedEvent() {
  const eventId = Number(document.getElementById("attendanceEvent")?.value || 0);
  const saveButton = document.getElementById("saveAttendanceBtn");
  const info = document.getElementById("attendanceEventInfo");

  if (!eventId) {
    attendanceRecords = [];
    renderAttendanceOfficerRows([]);
    if (info) info.textContent = "Choose an event to record attendance.";
    if (saveButton) saveButton.disabled = true;
    return;
  }

  try {
    const rows = await apiFetch("/workspace/attendance");
    attendanceRecords = (Array.isArray(rows) ? rows : []).filter(row =>
      Number(row.event_id ?? row.eventId) === eventId
    );
    renderAttendanceOfficerRows(attendanceRecords);
    const event = attendanceEvents.find(item =>
      Number(item.id ?? item.event_id ?? item.eventId) === eventId
    );
    if (info) info.textContent = `Attendance for: ${event?.title ?? event?.event_name ?? "Selected event"}`;
    if (saveButton) saveButton.disabled = attendanceOfficers.length === 0;
  } catch (error) {
    showToast(`Unable to load saved attendance: ${error.message}`);
    renderAttendanceOfficerRows([]);
  }
}

function renderAttendanceOfficerRows(records) {
  const body = document.getElementById("attendanceOfficerList");
  if (!body) return;

  if (!attendanceOfficers.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">No officers found.</td></tr>';
    return;
  }

  const recordByMember = new Map(records.map(record => [
    Number(record.member_id ?? record.memberId),
    record
  ]));

  body.innerHTML = attendanceOfficers.map((officer, index) => {
    const memberId = getOfficerMemberId(officer);
    const saved = recordByMember.get(memberId);
    const present = saved ? String(saved.attendance_status).toLowerCase() === "present" : false;
    const name = getOfficerDisplayName(officer);
    return `<tr>
      <td><input type="checkbox" class="attendance-present" data-member-id="${memberId}" aria-label="Mark ${escapeHtml(name)} present" ${present ? "checked" : ""}></td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(officer.position ?? officer.officer_position ?? "")}</td>
      <td><input type="text" class="attendance-remarks" data-member-id="${memberId}" value="${escapeHtml(saved?.remarks ?? "")}" aria-label="Remarks for ${escapeHtml(name)}" placeholder="Optional remarks"></td>
    </tr>`;
  }).join("");
}

async function saveAttendanceSheet() {
  const eventId = Number(document.getElementById("attendanceEvent")?.value || 0);
  const attendanceDate = document.getElementById("attendanceDate")?.value;
  const button = document.getElementById("saveAttendanceBtn");

  if (!eventId) {
    showToast("Please select an event first.");
    return;
  }
  if (!attendanceDate) {
    showToast("Please select the attendance date.");
    return;
  }
  if (!attendanceOfficers.length) {
    showToast("There are no officers to record.");
    return;
  }

  const officers = attendanceOfficers.map(officer => {
    const memberId = getOfficerMemberId(officer);
    return {
      memberId,
      memberName: getOfficerDisplayName(officer),
      isPresent: document.querySelector(`.attendance-present[data-member-id="${memberId}"]`)?.checked === true,
      remarks: document.querySelector(`.attendance-remarks[data-member-id="${memberId}"]`)?.value.trim() || null
    };
  });

  button.disabled = true;
  button.textContent = "Saving...";
  try {
    const result = await apiFetch("/workspace/attendance/sheet", {
      method: "POST",
      body: JSON.stringify({ eventId, attendanceDate, officers })
    });
    showToast(result?.message || "Attendance saved successfully.");
    await loadAttendanceForSelectedEvent();
  } catch (error) {
    showToast(`Unable to save attendance: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Save attendance";
  }
}

// =========================================
// MODULE LIST AND CRUD
// =========================================

async function renderModule(key) {
  const config = MODULES[key];
  const container = document.getElementById("pageContent");

  if (!config || !container) return;

  container.innerHTML = `
    <div class="hero">
      <h2>${escapeHtml(config.title)}</h2>
      <p>
        Manage ${escapeHtml(config.title.toLowerCase())} records.
        Changes are saved through the central API.
      </p>
    </div>

    <div class="toolbar">
      <input
        class="search-input"
        id="tableSearch"
        placeholder="Search displayed records..."
        aria-label="Search records"
      >

      <button class="primary-btn" id="addRecordBtn" type="button">
        + Add record
      </button>

      <button class="secondary-btn" id="refreshBtn" type="button">
        Refresh
      </button>
    </div>

    <div id="recordFormHost"></div>

    <div class="table-wrap">
      <table>
        <thead id="tableHead"></thead>
        <tbody id="tableBody">
          <tr><td>Loading...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("addRecordBtn")
    ?.addEventListener("click", () => showRecordForm(key));

  document.getElementById("refreshBtn")
    ?.addEventListener("click", () => loadModuleRows(key));

  document.getElementById("tableSearch")
    ?.addEventListener("input", event => filterRows(event.target.value));

  await loadModuleRows(key);
}

let activeRows = [];

async function loadModuleRows(key) {
  const config = MODULES[key];
  const body = document.getElementById("tableBody");
  const head = document.getElementById("tableHead");

  if (!config || !body || !head) return;

  try {
    const result = key === "officers"
      ? await apiFetch("/Officer/all")
      : await apiFetch(`/workspace/${config.endpoint}`);
    activeRows = Array.isArray(result) ? result : [];

    // Group Members by year and section, then sort each group by surname.
    if (key === "members") {
      const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
      const getLast = member => String(member.last_name || "").trim() ||
        String(member.full_name || "").trim().split(/\s+/).filter(Boolean).slice(-1)[0] || "";
      const getYear = member => String(member.year_section || "Unassigned").trim() || "Unassigned";
      activeRows.sort((a, b) =>
        collator.compare(getYear(a), getYear(b)) ||
        collator.compare(getLast(a), getLast(b)) ||
        collator.compare(a.first_name || a.full_name || "", b.first_name || b.full_name || "") ||
        collator.compare(a.middle_name || "", b.middle_name || "")
      );
    }

    let keys = activeRows.length
      ? Object.keys(activeRows[0]).filter(
          column => !["id", "member_id", "memberid", "event_id", "eventid", "user_id", "userid", "created_at", "updated_at"].includes(column.toLowerCase())
        )
      : config.fields.map(field => field[0]);
    if (key === "members") {
      keys = ["member_display_name", "year_section", "address", "contact"];
    }
    head.innerHTML = `
      <tr>
        ${keys.map(column => `<th scope="col">${escapeHtml(column === "member_display_name" ? "Name (Last, First Middle)" : column.replaceAll("_", " "))}</th>`).join("")}
        ${config.fields.length ? '<th scope="col">Actions</th>' : ""}
      </tr>
    `;
    renderRows(key, activeRows, keys);
  } catch (error) {
    body.innerHTML = `
      <tr>
        <td colspan="10">${escapeHtml(error.message)}</td>
      </tr>
    `;

    showToast(error.message);
  }
}

function renderRows(key, rows, keys) {
  const body = document.getElementById("tableBody");
  const config = MODULES[key];
  if (!body || !config) return;

  let visibleKeys = keys.filter(column =>
    !["id", "member_id", "memberid", "event_id", "eventid", "user_id", "userid"].includes(column.toLowerCase())
  );

  if (key === "members") {
    visibleKeys = ["member_display_name", "year_section", "address", "contact"];
  }

  const displayValue = (row, column) => {
    if (key === "members" && column === "member_display_name") {
      const last = String(row.last_name || "").trim();
      const first = String(row.first_name || "").trim();
      const middle = String(row.middle_name || "").trim();
      if (last || first || middle) return `${last}${last && (first || middle) ? ", " : ""}${[first, middle].filter(Boolean).join(" ")}`;
      return row.full_name || "";
    }
    return row[column] ?? "";
  };

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="${visibleKeys.length + (config.fields.length ? 1 : 0)}" class="empty">No records found.</td></tr>`;
    return;
  }

  let previousGroup = null;
  body.innerHTML = rows.map(row => {
    const group = String(row.year_section || "Unassigned").trim() || "Unassigned";
    const groupHeading = key === "members" && group !== previousGroup
      ? `<tr class="member-group-heading"><th colspan="${visibleKeys.length + (config.fields.length ? 1 : 0)}">${escapeHtml(group)}</th></tr>`
      : "";
    previousGroup = group;
    return `${groupHeading}<tr>
      ${visibleKeys.map(column => `<td>${escapeHtml(displayValue(row, column))}</td>`).join("")}
      ${config.fields.length ? `<td class="table-actions">
        <button class="secondary-btn" type="button" data-action="edit" data-id="${Number(row.id)}">Edit</button>
        <button class="danger-btn" type="button" data-action="delete" data-id="${Number(row.id)}">Delete</button>
      </td>` : ""}
    </tr>`;
  }).join("");

  body.querySelectorAll("button[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      if (button.dataset.action === "edit") editRecord(key, id);
      if (button.dataset.action === "delete") deleteRecord(key, id);
    });
  });
}

function filterRows(term) {
  const config = MODULES[currentPage];
  if (!config) return;
  const query = String(term || "").toLowerCase().trim();
  const rows = activeRows.filter(row => Object.entries(row).some(([key, value]) =>
    !["id", "member_id", "memberid", "event_id", "eventid", "user_id", "userid"].includes(key.toLowerCase()) &&
    String(value ?? "").toLowerCase().includes(query)
  ));
  renderRows(currentPage, rows, activeRows.length ? Object.keys(activeRows[0]) : []);
}

async function getMemberChoices(selectedMemberId = 0) {
  try {
    const result = await apiFetch("/workspace/members");
    const members = Array.isArray(result) ? result : [];
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    const nameParts = member => ({
      first: String(member.first_name || "").trim(),
      middle: String(member.middle_name || "").trim(),
      last: String(member.last_name || "").trim()
    });
    const groupOf = member => String(member.year_section || "Unassigned").trim() || "Unassigned";
    members.sort((a, b) => {
      const A = nameParts(a), B = nameParts(b);
      return collator.compare(groupOf(a), groupOf(b)) || collator.compare(A.last, B.last) ||
        collator.compare(A.first, B.first) || collator.compare(A.middle, B.middle);
    });
    const groups = new Map();
    for (const member of members) {
      const group = groupOf(member);
      if (!groups.has(group)) groups.set(group, []);
      const n = nameParts(member);
      const display = n.last || n.first || n.middle
        ? `${n.last}${n.last && (n.first || n.middle) ? ", " : ""}${[n.first, n.middle].filter(Boolean).join(" ")}`
        : (member.full_name || member.name || "Unnamed member");
      const searchable = [n.first, n.middle, n.last, display, group].filter(Boolean).join(" ").toLowerCase();
      groups.get(group).push(`<option value="${Number(member.id)}" data-name="${escapeHtml([n.first, n.middle, n.last].filter(Boolean).join(" ") || display)}" data-search="${escapeHtml(searchable)}" ${Number(member.id) === Number(selectedMemberId) ? "selected" : ""}>${escapeHtml(display)}</option>`);
    }
    return Array.from(groups, ([group, options]) => `<optgroup label="${escapeHtml(group)}">${options.join("")}</optgroup>`).join("");
  } catch (error) {
    console.error("Unable to load member choices:", error);
    showToast(`Unable to load members: ${error.message}`);
    return "";
  }
}

function splitFullName(fullName = "") {
    const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

    return {
        first_name: parts[0] || "",
        middle_name: "",
        last_name: parts.length > 1 ? parts[parts.length - 1] : ""
    };
}

async function showRecordForm(key, row = {}) {
  const config = MODULES[key];
  const host = document.getElementById("recordFormHost");
  if (!config || !host) return;

  const memberParts = key === "members"
    ? {
        first_name: row.first_name ?? row.full_name ?? "",
        middle_name: row.middle_name ?? "",
        last_name: row.last_name ?? ""
    }
    : {};
  const memberOptions = key === "officers" ? await getMemberChoices(row.member_id || 0) : "";
  const positions = ["Governor", "Vice Governor", "Secretary", "Treasurer", "Auditor", "Multimedia 1", "Multimedia 2", "1st Year Representative", "2nd Year Representative", "3rd Year Representative", "4th Year Representative"];

  host.innerHTML = `
    <div class="panel record-editor">
      <h3>${row.id ? "Edit" : "Add"} ${escapeHtml(config.title.replace(/s$/, ""))}</h3>
      <form id="recordForm"><div class="form-grid">
        ${config.fields.map(([name, label, type]) => {
          const [kind, options] = type.split(":");
          let value = row[name] ?? "";
          if (key === "members" && Object.hasOwn(memberParts, name)) value = memberParts[name];
          if (key === "officers" && name === "full_name") {
    return `
      <div class="field full">
        <label>Select Member</label>

        <div class="member-combo" id="memberCombo">
          <button
            type="button"
            class="member-combo-trigger"
            id="memberComboTrigger"
            aria-expanded="false">
            Choose an existing member <span>▾</span>
          </button>

          <div class="member-combo-panel" id="memberComboPanel" hidden>
            <input
              type="search"
              id="memberSearch"
              placeholder="Search first, middle, or last name..."
              autocomplete="off">

            <div
              class="member-combo-options"
              id="memberComboOptions">
            </div>
          </div>

          <select id="f-full_name" required class="member-combo-value">
            <option value="">Choose an existing member</option>
            ${memberOptions}
          </select>
        </div>
      </div>
    `;
}
          if (key === "officers" && name === "member_id") return `<input id="f-member_id" type="hidden" value="${Number(row.member_id || 0)}">`;
          if (key === "officers" && name === "position") return `<div class="field"><label for="f-position">Officer position</label><select id="f-position" required><option value="">Choose position</option>${positions.map(p => `<option value="${p}" ${row.position === p ? "selected" : ""}>${p}</option>`).join("")}</select></div>`;
          if (kind === "textarea") return `<div class="field full"><label for="f-${name}">${escapeHtml(label)}</label><textarea id="f-${name}">${escapeHtml(value)}</textarea></div>`;
          if (kind === "select") return `<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><select id="f-${name}">${options.split(",").map(o => `<option value="${escapeHtml(o)}" ${value === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select></div>`;
          const required = ["first_name", "last_name", "year_section", "address", "contact", "email", "amount", "title", "event_date", "attendance_date", "transaction_date"].includes(name);
          return `<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><input id="f-${name}" type="${kind}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
        }).join("")}
      </div><div class="form-actions">
        <button class="primary-btn" type="submit">${row.id ? "Update record" : "Save record"}</button>
        <button class="secondary-btn" type="button" id="cancelForm">Cancel</button>
      </div></form>
    </div>`;

  document.getElementById("cancelForm").addEventListener("click", () => { host.innerHTML = ""; });

  if (key === "officers") {
    const combo = document.getElementById("memberCombo");
const trigger = document.getElementById("memberComboTrigger");
const panel = document.getElementById("memberComboPanel");
const search = document.getElementById("memberSearch");
const select = document.getElementById("f-full_name");
const optionsHost = document.getElementById("memberComboOptions");

function renderMemberOptions(query = "") {
    const q = query.trim().toLowerCase();
    const groups = Array.from(select.querySelectorAll("optgroup"));
    let count = 0;

    optionsHost.innerHTML = groups.map(group => {
        const matches = Array.from(group.querySelectorAll("option")).filter(option =>
            !q || (option.dataset.search || option.textContent.toLowerCase()).includes(q)
        );

        if (!matches.length) return "";

        count += matches.length;

        return `
            <div class="member-combo-group">
                <div class="member-combo-group-label">
                    ${group.label}
                </div>

                ${matches.map(option => `
                    <button
                        type="button"
                        class="member-combo-option ${option.selected ? "selected" : ""}"
                        data-value="${option.value}">
                        ${option.textContent}
                    </button>
                `).join("")}
            </div>
        `;
    }).join("");

    if (!count) {
        optionsHost.innerHTML =
            `<div class="member-combo-empty">No matching members found</div>`;
    }
}

renderMemberOptions();

trigger.addEventListener("click", () => {
    const opening = panel.hidden;

    panel.hidden = !opening;
    trigger.setAttribute("aria-expanded", String(opening));

    if (opening) {
        search.value = "";
        renderMemberOptions();
        search.focus();
    }
});

search.addEventListener("input", () => {
    renderMemberOptions(search.value);
});

optionsHost.addEventListener("click", event => {
    const optionButton = event.target.closest("[data-value]");

    if (!optionButton) return;

    select.value = optionButton.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    trigger.innerHTML =
        `${optionButton.textContent} <span>▾</span>`;

    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");

    renderMemberOptions();
});

if (select.value) {
    const selected = select.selectedOptions[0];

    if (selected) {
        trigger.innerHTML =
            `${selected.textContent} <span>▾</span>`;
    }
}

document.addEventListener("click", event => {
    if (combo && !combo.contains(event.target)) {
        panel.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    }
});
    const memberSearch = document.getElementById("memberSearch");
    const memberSelect = document.getElementById("f-full_name");
    memberSearch?.addEventListener("input", () => {
      const query = memberSearch.value.trim().toLowerCase();
      let visibleCount = 0;
      Array.from(memberSelect.options).forEach(option => {
        if (!option.value) {
          option.hidden = false;
          return;
        }
        const matches = !query || (option.dataset.search || option.textContent.toLowerCase()).includes(query);
        option.hidden = !matches;
        if (matches) visibleCount++;
      });
      const emptyOption = memberSelect.querySelector("option[value='']");
      if (emptyOption) emptyOption.textContent = visibleCount ? "Choose an existing member" : "No matching members";
    });
  }

  document.getElementById("recordForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = row.id ? "Updating..." : "Saving...";
    try {
      const payload = {};
      for (const [name, label, type] of config.fields) {
        const el = document.getElementById(`f-${name}`);
        if (!el) continue;
        let value = el.value.trim();
        if (type === "number") value = value === "" ? null : Number(value);
        payload[name] = value === "" ? null : value;
      }
      
      if (key === "officers") {
        const selectedMember = document.getElementById("f-full_name")?.selectedOptions[0];
        if (!selectedMember || !selectedMember.value) throw new Error("Select an existing member first.");
        payload.member_id = Number(selectedMember.value);
        payload.full_name = selectedMember.dataset.name || selectedMember.textContent.split(" — ")[0];
      }
      await apiFetch(`/workspace/${config.endpoint}${row.id ? `/${row.id}` : ""}`, {
        method: row.id ? "PUT" : "POST", body: JSON.stringify(payload)
      });
      showToast(row.id ? "Record updated successfully." : "Record saved successfully.");
      host.innerHTML = "";
      await loadModuleRows(key);
    } catch (error) {
      showToast(error.message || "Unable to save record.");
      submit.disabled = false;
      submit.textContent = row.id ? "Update record" : "Save record";
    }
  });
}

function editRecord(key, id) {
  const row = activeRows.find(item => Number(item.id) === Number(id));
  if (row) showRecordForm(key, row);
  else showToast("Record not found. Refresh the list and try again.");
}

async function deleteRecord(key, id) {
  if (!MODULES[key] || !Number.isInteger(Number(id)) || Number(id) <= 0) return;
  if (!confirm("Delete this record? This action cannot be undone.")) return;
  try {
    await apiFetch(`/workspace/${MODULES[key].endpoint}/${id}`, { method: "DELETE" });
    showToast("Record deleted successfully.");
    await loadModuleRows(key);
  } catch (error) {
    showToast(error.message || "Unable to delete this record. It may be linked to another record.");
  }
}

// USER MANAGEMENT
// =========================================

async function renderUsers() {
  const container = document.getElementById("pageContent");
  if (!container) return;

  if (getUser()?.role !== "Admin") {
    container.innerHTML = `
      <div class="panel">Administrator access is required.</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="hero">
      <h2>User Management</h2>
      <p>Review accounts, assign organization roles and manage access.</p>
    </div>

    <div class="toolbar">
      <input
        id="userSearch"
        class="search-input"
        placeholder="Search username or role"
      >

      <button class="secondary-btn" id="refreshUsers" type="button">
        Refresh
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="usersBody">
          <tr><td colspan="6">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  let rows = [];

  const draw = () => {
    const search = document.getElementById("userSearch");
    const body = document.getElementById("usersBody");

    if (!search || !body) return;

    const query = search.value.toLowerCase();

    const filtered = rows.filter(user =>
      `${user.username} ${user.role}`.toLowerCase().includes(query)
    );

    body.innerHTML = filtered.map(user => `
      <tr>
        <td>${escapeHtml(user.id)}</td>
        <td>${escapeHtml(user.username)}</td>

        <td>
          <select id="role-${Number(user.id)}" aria-label="Role for ${escapeHtml(user.username)}">
            ${["Adviser"]
              .map(role => `
                <option ${role === user.role ? "selected" : ""}>
                  ${role}
                </option>
              `).join("")}
          </select>
        </td>

        <td>
          <span class="status ${user.isActive ? "" : "inactive"}">
            ${user.isActive ? "Active" : "Inactive"}
          </span>
        </td>

        <td>${escapeHtml(user.createdAt)}</td>

        <td>
          <button
            class="secondary-btn"
            type="button"
            onclick="saveRole(${Number(user.id)})"
          >Save role</button>

          <button
            class="danger-btn"
            type="button"
            onclick="setUserStatus(${Number(user.id)}, ${!user.isActive})"
          >${user.isActive ? "Deactivate" : "Activate"}</button>
        </td>
      </tr>
    `).join("") || `
      <tr><td colspan="6" class="empty">No users found.</td></tr>
    `;
  };

  try {
    rows = await apiFetch("/user/all");
    if (!Array.isArray(rows)) rows = [];
    draw();
  } catch (error) {
    document.getElementById("usersBody").innerHTML = `
      <tr><td colspan="6">${escapeHtml(error.message)}</td></tr>
    `;
  }

  document.getElementById("userSearch").oninput = draw;
  document.getElementById("refreshUsers").onclick = renderUsers;
}

async function saveRole(id) {
  const role = document.getElementById(`role-${id}`)?.value;
  if (!role) return;

  if (!confirm(
    `Assign ${role} role to this user? They must sign in again.`
  )) {
    return;
  }

  try {
    const result = await apiFetch(`/user/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role })
    });

    showToast(result?.message || "User role updated.");
    renderUsers();
  } catch (error) {
    showToast(error.message);
  }
}

async function setUserStatus(id, isActive) {
  if (!confirm(`${isActive ? "Activate" : "Deactivate"} this account?`)) {
    return;
  }

  try {
    const result = await apiFetch(`/user/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive })
    });

    showToast(result?.message || "User status updated.");
    renderUsers();
  } catch (error) {
    showToast(error.message);
  }
}

// =========================================
// REPORTS
// =========================================


async function renderReports() {
  const container = document.getElementById("pageContent");
  if (!container) return;

  container.innerHTML = `
    <div class="report-actions">
      <button class="primary-btn" data-report="members">
        Member Records PDF
      </button>

      <button class="primary-btn" data-report="attendance">
        Attendance PDF
      </button>

      ${getUser()?.role === "Adviser"
        ? `<button class="primary-btn" data-report="finance">
             Membership Fee Records PDF
           </button>`
        : ""}
    </div>

    <section id="reportPreview" class="panel report-preview">
      <p>Select a report above to preview it.</p>
    </section>
  `;

  container.querySelectorAll("[data-report]").forEach(button => {
    button.addEventListener("click", () => {
      generatePrintableReport(button.dataset.report);
    });
  });
}



async function generatePrintableReport(type) {
  const reportConfig = {
    members: { title: "Member Records", endpoint: "members" },
    attendance: { title: "Attendance Records", endpoint: "attendance" },
    finance: { title: "Membership Fee Records", endpoint: "finance" }
  }[type];

  if (!reportConfig) return;

  const preview = document.getElementById("reportPreview");
  if (!preview) return;

  preview.innerHTML = "<p>Loading report...</p>";

  try {
    // Keep the existing advanced attendance report.
    if (type === "attendance") {
      await renderAdvancedAttendanceReport(preview);
      return;
    }

    if (type === "members") {
      await renderAdvancedMemberReport(preview);
      return;
    }

    // Membership Fee Report uses its own API.
    if (type === "finance") {
      await renderAdvancedMembershipFeeReport(preview);
      return;
    }

    // Existing Member Records report.
    const rows = await apiFetch(`/workspace/${reportConfig.endpoint}`);
    const records = Array.isArray(rows) ? rows : [];

    let columns = records.length
      ? Object.keys(records[0]).filter(k =>
          ![
            "id", "member_id", "memberid",
            "event_id", "eventid", "user_id", "userid"
          ].includes(k.toLowerCase())
        )
      : [];

    if (type === "members") {
      const memberColumns = ["first_name", "middle_name", "last_name"];
      columns = columns.filter(column => column !== "full_name");
      columns = [
        ...memberColumns,
        ...columns.filter(column => !memberColumns.includes(column))
      ];
    }

    const reportValue = (row, column) => {
      if (["first_name", "middle_name", "last_name"].includes(column)) {
        const value = row[column];

        if (value !== null && value !== undefined && String(value).trim() !== "") {
          return value;
        }

        return column === "first_name" ? (row.full_name || "") : "";
      }

      return row[column] ?? "";
    };

    preview.innerHTML = `
      <div class="print-report-header">
        <h2>CYBER SMART SOCIETY</h2>
        <h3>${reportConfig.title}</h3>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>

      ${records.length ? `
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                ${columns.map(c => `
                  <th>${escapeHtml(c.replaceAll("_", " "))}</th>
                `).join("")}
              </tr>
            </thead>
            <tbody>
              ${records.map(row => `
                <tr>
                  ${columns.map(c => `
                    <td>${escapeHtml(reportValue(row, c))}</td>
                  `).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : "<p>No records are available for this report.</p>"}

      <div class="report-print-controls no-print">
        <button class="primary-btn" type="button" id="printReportBtn">
          Print / Save as PDF
        </button>
      </div>
    `;

    document.getElementById("printReportBtn")
      ?.addEventListener("click", () => window.print());

  } catch (error) {
    preview.innerHTML = `
      <p class="error-text">
        Unable to generate report: ${escapeHtml(error.message)}
      </p>
    `;
  }
}

// =============================================
// MEMBERSHIP FEE REPORT
// =============================================

let membershipReportFees = [];
let membershipReportPayments = [];
let membershipReportStudents = [];
let membershipReportSummary = null;
let membershipReportFiltered = [];

function membershipReportMoney(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(Number(value || 0));
}

function membershipReportEscape(value) {
  return escapeHtml(value ?? "");
}

function membershipReportGetDate(value) {
  if (!value) return null;

  const date = new Date(`${String(value).substring(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function membershipReportStatusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

// =============================================
// LOAD REPORT PAGE
// =============================================

async function renderAdvancedMembershipFeeReport(preview) {
  try {
    preview.innerHTML = "<p>Loading membership fee configurations...</p>";

    const fees = await apiFetch("/membership-fees");

    membershipReportFees = Array.isArray(fees) ? fees : [];

    if (membershipReportFees.length === 0) {
      preview.innerHTML = `
        <div class="panel">
          <h3>No Membership Fee Records</h3>
          <p>No membership fee configuration is available.</p>
        </div>
      `;
      return;
    }

    preview.innerHTML = `
      <div class="membership-report-toolbar no-print">

        <div class="form-grid">

          <div class="field">
            <label>Academic Year / Semester</label>
            <select id="membershipReportFee">
              ${membershipReportFees.map(fee => `
                <option value="${Number(fee.fee_id)}">
                  ${membershipReportEscape(fee.academic_year)}
                  - ${membershipReportEscape(fee.semester)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="field">
            <label>Verification Status</label>
            <select id="membershipReportStatus">
              <option value="">All Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div class="field">
            <label>Payment Method</label>
            <select id="membershipReportMethod">
              <option value="">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
          </div>

          <div class="field">
            <label>From Date</label>
            <input type="date" id="membershipReportFrom">
          </div>

          <div class="field">
            <label>To Date</label>
            <input type="date" id="membershipReportTo">
          </div>

          <div class="field">
            <label>Search Student</label>
            <input
              type="search"
              id="membershipReportSearch"
              placeholder="Search student name..."
            >
          </div>

        </div>

        <div class="form-actions">
          <button class="secondary-btn" type="button"
            id="clearMembershipReport">
            Clear Filters
          </button>

          <button class="secondary-btn" type="button"
            id="exportMembershipReport">
            Export CSV
          </button>
        </div>

      </div>

      <div id="membershipReportContent">
        <p>Loading report...</p>
      </div>
    `;

    const filterIds = [
      "membershipReportFee",
      "membershipReportStatus",
      "membershipReportMethod",
      "membershipReportFrom",
      "membershipReportTo",
      "membershipReportSearch"
    ];

    filterIds.forEach(id => {
      const element = document.getElementById(id);

      element?.addEventListener("change", updateMembershipFeeReport);

      if (id === "membershipReportSearch") {
        element?.addEventListener("input", updateMembershipFeeReport);
      }
    });

    document.getElementById("clearMembershipReport")
      ?.addEventListener("click", () => {
        filterIds.forEach(id => {
          const element = document.getElementById(id);
          if (element) element.value = "";
        });

        updateMembershipFeeReport();
      });

    document.getElementById("exportMembershipReport")
      ?.addEventListener("click", exportMembershipFeeReport);

    await updateMembershipFeeReport();

  } catch (error) {
    preview.innerHTML = `
      <div class="panel">
        <h3>Unable to Load Membership Fee Report</h3>
        <p class="error-text">
          ${membershipReportEscape(error.message)}
        </p>
      </div>
    `;
  }
}

// =============================================
// LOAD SELECTED FEE REPORT DATA
// =============================================

async function updateMembershipFeeReport() {
  const content = document.getElementById("membershipReportContent");
  const feeSelect = document.getElementById("membershipReportFee");

  if (!content || !feeSelect) return;

  const feeId = Number(feeSelect.value);

  if (!feeId) {
    content.innerHTML = "<p>Please select a membership fee.</p>";
    return;
  }

  content.innerHTML = "<p>Loading membership fee information...</p>";

  try {
    const [summary, history, studentResult] = await Promise.all([
      apiFetch(`/membership-fees/${feeId}/collection-summary`),
      apiFetch(`/membership-fees/payments/history?feeId=${feeId}`),
      apiFetch(`/membership-fees/${feeId}/student-status`)
    ]);

    membershipReportSummary = summary;

    membershipReportPayments = Array.isArray(history)
      ? history
      : [];

    membershipReportStudents = Array.isArray(studentResult?.students)
      ? studentResult.students
      : [];

    applyMembershipReportFilters();

  } catch (error) {
    content.innerHTML = `
      <p class="error-text">
        Unable to load report data:
        ${membershipReportEscape(error.message)}
      </p>
    `;
  }
}

// =============================================
// APPLY REPORT FILTERS
// =============================================

function applyMembershipReportFilters() {
  const status =
    document.getElementById("membershipReportStatus")?.value || "";

  const method =
    document.getElementById("membershipReportMethod")?.value || "";

  const from = membershipReportGetDate(
    document.getElementById("membershipReportFrom")?.value
  );

  const to = membershipReportGetDate(
    document.getElementById("membershipReportTo")?.value
  );

  const search = (
    document.getElementById("membershipReportSearch")?.value || ""
  ).trim().toLowerCase();

  membershipReportFiltered = membershipReportPayments.filter(payment => {
    const paymentStatus = String(payment.verification_status || "");
    const paymentMethod = String(payment.payment_method || "");
    const paymentDate = membershipReportGetDate(payment.payment_date);
    const studentName = String(payment.student_name || "").toLowerCase();

    if (status && paymentStatus !== status) return false;
    if (method && paymentMethod !== method) return false;

    if (from && (!paymentDate || paymentDate < from)) return false;

    if (to && (!paymentDate || paymentDate > to)) return false;

    if (search && !studentName.includes(search)) return false;

    return true;
  });

  renderMembershipFeeReportContent();
}

// =============================================
// DISPLAY REPORT
// =============================================

function renderMembershipFeeReportContent() {
  const content = document.getElementById("membershipReportContent");

  if (!content || !membershipReportSummary) return;

  const summary = membershipReportSummary;

  const students = summary.students || {};
  const collection = summary.collection || {};
  const pending = summary.pending_gcash || {};

  const verifiedAmount = membershipReportFiltered
    .filter(payment => payment.verification_status === "Verified")
    .reduce((total, payment) => {
      return total + Number(payment.amount_paid || 0);
    }, 0);

  const paymentRows = membershipReportFiltered.map(payment => `
    <tr>
      <td>${membershipReportEscape(payment.student_name)}</td>
      <td>${membershipReportEscape(payment.payment_date)}</td>
      <td>${membershipReportEscape(payment.payment_method)}</td>
      <td>${membershipReportEscape(payment.reference_number || "—")}</td>
      <td>${membershipReportMoney(payment.amount_paid)}</td>
      <td>
        <span class="fee-status ${membershipReportStatusClass(payment.verification_status)}">
          ${membershipReportEscape(payment.verification_status)}
        </span>
      </td>
      <td>${membershipReportEscape(payment.receipt_number || "—")}</td>
    </tr>
  `).join("");

  const studentRows = membershipReportStudents.map(student => `
    <tr>
      <td>${membershipReportEscape(student.student_name)}</td>
      <td>${membershipReportMoney(student.required_amount)}</td>
      <td>${membershipReportMoney(student.total_paid)}</td>
      <td>${membershipReportMoney(student.balance)}</td>
      <td>
        <span class="fee-status ${membershipReportStatusClass(student.payment_status)}">
          ${membershipReportEscape(student.payment_status)}
        </span>
      </td>
    </tr>
  `).join("");

  const percentage = Math.min(
    100,
    Math.max(0, Number(collection.collection_percentage || 0))
  );

  content.innerHTML = `
    <div class="membership-report-document">

      <div class="print-report-header">
        <h2>CYBER SMART SOCIETY</h2>
        <h3>MEMBERSHIP FEE COLLECTION REPORT</h3>
        <p>
          Academic Year:
          <strong>${membershipReportEscape(summary.academic_year)}</strong>
        </p>
        <p>
          Semester:
          <strong>${membershipReportEscape(summary.semester)}</strong>
        </p>
        <p>
          Generated: ${new Date().toLocaleString("en-PH")}
        </p>
      </div>

      <section class="attendance-kpis">

        <div class="attendance-kpi">
          <small>Total Students</small>
          <strong>${Number(students.total_members || 0)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Fully Paid</small>
          <strong>${Number(students.fully_paid || 0)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Partially Paid</small>
          <strong>${Number(students.partially_paid || 0)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Unpaid</small>
          <strong>${Number(students.unpaid || 0)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Total Collected</small>
          <strong>${membershipReportMoney(collection.total_collected)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Remaining Collection</small>
          <strong>${membershipReportMoney(collection.remaining_collection)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Pending GCash Transactions</small>
          <strong>${Number(pending.pending_transactions || 0)}</strong>
        </div>

        <div class="attendance-kpi">
          <small>Pending GCash Amount</small>
          <strong>${membershipReportMoney(pending.pending_amount)}</strong>
        </div>

      </section>

      <section class="attendance-analytics-card">
        <h3>Collection Overview</h3>

        <p>
          Required Fee per Student:
          <strong>${membershipReportMoney(summary.required_amount_per_member)}</strong>
        </p>

        <p>
          Expected Collection:
          <strong>${membershipReportMoney(collection.expected_collection)}</strong>
        </p>

        <p>
          Total Verified Collection:
          <strong>${membershipReportMoney(collection.total_collected)}</strong>
        </p>

        <p>
          Collection Percentage:
          <strong>${percentage.toFixed(2)}%</strong>
        </p>

        <div class="fee-progress">
          <span style="width:${percentage}%"></span>
        </div>
      </section>

      <section class="attendance-analytics-card">
        <h3>Student Payment Status</h3>

        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Required Fee</th>
                <th>Total Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${studentRows || `
                <tr>
                  <td colspan="5">No student records found.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>

      <section class="attendance-analytics-card">
        <h3>Payment Transaction History</h3>

        <p>
          Displayed Transactions:
          <strong>${membershipReportFiltered.length}</strong>
        </p>

        <p>
          Verified Amount in Filtered Records:
          <strong>${membershipReportMoney(verifiedAmount)}</strong>
        </p>

        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference No.</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt No.</th>
              </tr>
            </thead>

            <tbody>
              ${paymentRows || `
                <tr>
                  <td colspan="7">
                    No payment transactions found for the selected filters.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </section>

      <div class="report-print-controls no-print">
        <button class="primary-btn" type="button" id="printMembershipReport">
          Print / Save as PDF
        </button>
      </div>

    </div>
  `;

  document.getElementById("printMembershipReport")
    ?.addEventListener("click", () => window.print());
}

// =============================================
// EXPORT MEMBERSHIP FEE REPORT TO CSV
// =============================================

function exportMembershipFeeReport() {
  if (!membershipReportFiltered.length) {
    showToast("No payment records available to export.");
    return;
  }

  const headers = [
    "Student Name",
    "Academic Year",
    "Semester",
    "Payment Date",
    "Payment Method",
    "Reference Number",
    "Amount Paid",
    "Verification Status",
    "Receipt Number"
  ];

  const csvEscape = value =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  const rows = membershipReportFiltered.map(payment => [
    payment.student_name,
    payment.academic_year,
    payment.semester,
    payment.payment_date,
    payment.payment_method,
    payment.reference_number,
    payment.amount_paid,
    payment.verification_status,
    payment.receipt_number
  ]);

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map(row => row.map(csvEscape).join(","))
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "CSS_Membership_Fee_Report.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Membership Fee Report exported successfully.");
}


let memberReportRows = [];
let memberReportFilteredRows = [];

function memberReportValue(row, key) {
  const value = row[key];
  if (value !== null && value !== undefined && String(value).trim() !== "") {
    return String(value);
  }

  if (key === "first_name" && row.full_name) {
    return String(row.full_name);
  }

  return "";
}

function memberReportSection(row) {
  return String(
    row.year_section ??
    row.yearSection ??
    "Unassigned"
  ).trim() || "Unassigned";
}

function memberReportSort(rows) {
  return [...rows].sort((a, b) => {
    const sectionCompare = memberReportSection(a).localeCompare(
      memberReportSection(b),
      undefined,
      { numeric: true, sensitivity: "base" }
    );

    if (sectionCompare !== 0) return sectionCompare;

    return (
      String(a.last_name ?? "").localeCompare(String(b.last_name ?? "")) ||
      String(a.first_name ?? "").localeCompare(String(b.first_name ?? "")) ||
      String(a.middle_name ?? "").localeCompare(String(b.middle_name ?? ""))
    );
  });
}

async function renderAdvancedMemberReport(preview) {
  preview.innerHTML = "<p>Loading member records...</p>";

  try {
    const result = await apiFetch("/workspace/members");

    memberReportRows = Array.isArray(result) ? result : [];
    memberReportRows = memberReportSort(memberReportRows);

    preview.innerHTML = `
      <div class="member-report-toolbar no-print">
        <div class="field">
          <label for="memberReportSearch">Search member</label>
          <input
            type="search"
            id="memberReportSearch"
            placeholder="Search name, year, or section..."
          >
        </div>

        <div class="member-report-actions">
          <span id="memberReportCount"></span>

          <button
            class="secondary-btn"
            type="button"
            id="clearMemberReportSearch"
          >
            Clear
          </button>

          <button
            class="primary-btn"
            type="button"
            id="printMemberReport"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div id="memberReportPrintable">
        <div class="print-report-header">
          <h2>CYBER SMART SOCIETY</h2>
          <h3>Member Records</h3>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div id="memberReportTableContainer"></div>
      </div>
    `;

    document.getElementById("memberReportSearch")
      ?.addEventListener("input", updateMemberReport);

    document.getElementById("clearMemberReportSearch")
      ?.addEventListener("click", () => {
        const search = document.getElementById("memberReportSearch");
        if (search) search.value = "";
        updateMemberReport();
      });

    document.getElementById("printMemberReport")
      ?.addEventListener("click", () => window.print());

    updateMemberReport();

  } catch (error) {
    preview.innerHTML = `
      <p class="error-text">
        Unable to load member records: ${escapeHtml(error.message)}
      </p>
    `;
  }
}

function updateMemberReport() {
  const search = (
    document.getElementById("memberReportSearch")?.value || ""
  ).trim().toLowerCase();

  memberReportFilteredRows = memberReportRows.filter(row => {
    const searchableText = [
      row.first_name,
      row.middle_name,
      row.last_name,
      row.full_name,
      row.year_section,
      row.yearSection,
      row.address,
      row.contact
    ].join(" ").toLowerCase();

    return searchableText.includes(search);
  });

  renderMemberReportTable();
}

function renderMemberReportTable() {
  const container = document.getElementById("memberReportTableContainer");
  const count = document.getElementById("memberReportCount");

  if (!container) return;

  const rows = memberReportFilteredRows;

  if (count) {
    count.textContent =
      `Showing ${rows.length} of ${memberReportRows.length} members`;
  }

  if (!rows.length) {
    container.innerHTML = `
      <p class="empty">No member records found.</p>
    `;
    return;
  }

  const columns = [
    ["last_name", "Last Name"],
    ["first_name", "First Name"],
    ["middle_name", "Middle Name"],
    ["year_section", "Year & Section"],
    ["address", "Address"],
    ["contact", "Contact"]
  ];

  // Only display columns available in the member records.
  const availableColumns = columns.filter(([key]) =>
    rows.some(row =>
      key === "year_section"
        ? ("year_section" in row || "yearSection" in row)
        : key in row
    )
  );

  const grouped = new Map();

  rows.forEach(row => {
    const section = memberReportSection(row);

    if (!grouped.has(section)) {
      grouped.set(section, []);
    }

    grouped.get(section).push(row);
  });

  container.innerHTML = `
    <div class="table-wrap member-report-table-wrap">
      <table class="report-table member-report-table">
        <thead>
          <tr>
            <th>No.</th>
            ${availableColumns.map(([, label]) =>
              `<th>${escapeHtml(label)}</th>`
            ).join("")}
          </tr>
        </thead>

        <tbody>
          ${(() => {
            let number = 0;

            return [...grouped.entries()].map(([section, members]) => `
              <tr class="member-report-group">
                <td colspan="${availableColumns.length + 1}">
                  YEAR & SECTION: ${escapeHtml(section)}
                  <span>(${members.length} members)</span>
                </td>
              </tr>

              ${members.map(row => {
                number++;

                return `
                  <tr>
                    <td>${number}</td>

                    ${availableColumns.map(([key]) => {
                      let value = key === "year_section"
                        ? memberReportSection(row)
                        : memberReportValue(row, key);

                      return `<td>${escapeHtml(value)}</td>`;
                    }).join("")}
                  </tr>
                `;
              }).join("")}
            `).join("");
          })()}
        </tbody>
      </table>
    </div>
  `;
}


// =========================================
// ADVANCED ATTENDANCE REPORTS
// =========================================

let attendanceReportRows = [];
let attendanceReportEvents = [];
let attendanceReportFilteredRows = [];

function attendanceReportDate(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function attendanceReportStatus(row) {
  return String(row.attendance_status ?? row.status ?? "Unknown").trim() || "Unknown";
}

function attendanceReportName(row) {
  return String(row.member_name ?? row.full_name ?? row.name ?? "Unknown officer").trim();
}

function attendanceReportEventName(row) {
  const id = Number(row.event_id ?? row.eventId ?? 0);
  const event = attendanceReportEvents.find(item => Number(item.id ?? item.event_id ?? item.eventId) === id);
  return event?.title ?? event?.event_name ?? event?.eventName ?? `Event #${id || "N/A"}`;
}

async function renderAdvancedAttendanceReport(preview) {
  preview.innerHTML = '<p>Loading attendance analytics...</p>';
  try {
    const [attendanceResult, eventsResult] = await Promise.all([
      apiFetch("/workspace/attendance"),
      apiFetch("/workspace/events")
    ]);
    attendanceReportRows = Array.isArray(attendanceResult) ? attendanceResult : [];
    attendanceReportEvents = Array.isArray(eventsResult) ? eventsResult : [];

    const eventOptions = attendanceReportEvents.map(event => {
      const id = Number(event.id ?? event.event_id ?? event.eventId ?? 0);
      const title = event.title ?? event.event_name ?? event.eventName ?? `Event #${id}`;
      return `<option value="${id}">${escapeHtml(title)}</option>`;
    }).join("");

    preview.innerHTML = `
      <div class="attendance-report-toolbar no-print">
        <div class="form-grid">
          <div class="field"><label for="attendanceReportEvent">Event</label><select id="attendanceReportEvent"><option value="">All events</option>${eventOptions}</select></div>
          <div class="field"><label for="attendanceReportStatus">Attendance status</label><select id="attendanceReportStatus"><option value="">All statuses</option><option>Present</option><option>Absent</option><option>Late</option><option>Excused</option></select></div>
          <div class="field"><label for="attendanceReportFrom">From date</label><input type="date" id="attendanceReportFrom"></div>
          <div class="field"><label for="attendanceReportTo">To date</label><input type="date" id="attendanceReportTo"></div>
          <div class="field"><label for="attendanceReportOfficer">Search officer</label><input type="search" id="attendanceReportOfficer" placeholder="Officer name..."></div>
        </div>
        <div class="form-actions">
          <button class="secondary-btn" type="button" id="clearAttendanceReportFilters">Clear filters</button>
          <button class="secondary-btn" type="button" id="exportAttendanceCsv">Export Excel-compatible CSV</button>
        </div>
      </div>
      <div id="attendanceReportContent"></div>`;

    ["attendanceReportEvent", "attendanceReportStatus", "attendanceReportFrom", "attendanceReportTo", "attendanceReportOfficer"].forEach(id => {
      document.getElementById(id)?.addEventListener("input", updateAttendanceReportView);
      document.getElementById(id)?.addEventListener("change", updateAttendanceReportView);
    });
    document.getElementById("clearAttendanceReportFilters")?.addEventListener("click", () => {
      ["attendanceReportEvent", "attendanceReportStatus", "attendanceReportFrom", "attendanceReportTo", "attendanceReportOfficer"].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = "";
      });
      updateAttendanceReportView();
    });
    document.getElementById("exportAttendanceCsv")?.addEventListener("click", exportAttendanceReportCsv);
    updateAttendanceReportView();
  } catch (error) {
    preview.innerHTML = `<p class="error-text">Unable to generate attendance report: ${escapeHtml(error.message)}</p>`;
  }
}

function updateAttendanceReportView() {
  const content = document.getElementById("attendanceReportContent");
  if (!content) return;
  const eventId = document.getElementById("attendanceReportEvent")?.value || "";
  const status = (document.getElementById("attendanceReportStatus")?.value || "").toLowerCase();
  const from = attendanceReportDate(document.getElementById("attendanceReportFrom")?.value);
  const to = attendanceReportDate(document.getElementById("attendanceReportTo")?.value);
  const search = (document.getElementById("attendanceReportOfficer")?.value || "").trim().toLowerCase();

  attendanceReportFilteredRows = attendanceReportRows.filter(row => {
    const rowEventId = String(row.event_id ?? row.eventId ?? "");
    const rowDate = attendanceReportDate(row.attendance_date);
    if (eventId && rowEventId !== eventId) return false;
    if (status && attendanceReportStatus(row).toLowerCase() !== status) return false;
    if (from && (!rowDate || rowDate < from)) return false;
    if (to && (!rowDate || rowDate > to)) return false;
    if (search && !attendanceReportName(row).toLowerCase().includes(search)) return false;
    return true;
  });

  const rows = attendanceReportFilteredRows;
  const total = rows.length;
  const countStatus = value => rows.filter(row => attendanceReportStatus(row).toLowerCase() === value.toLowerCase()).length;
  const present = countStatus("Present");
  const absent = countStatus("Absent");
  const late = countStatus("Late");
  const excused = countStatus("Excused");
  const rate = total ? Math.round((present / total) * 1000) / 10 : 0;

  const eventCounts = new Map();
  rows.forEach(row => {
    const label = attendanceReportEventName(row);
    const item = eventCounts.get(label) || { present: 0, absent: 0, other: 0, total: 0 };
    const s = attendanceReportStatus(row).toLowerCase();
    if (s === "present") item.present++;
    else if (s === "absent") item.absent++;
    else item.other++;
    item.total++;
    eventCounts.set(label, item);
  });
  const chartRows = [...eventCounts.entries()].sort((a,b) => b[1].total-a[1].total).slice(0,6);
  const maxEvent = Math.max(1, ...chartRows.map(([,v]) => v.total));
  const chart = chartRows.length ? chartRows.map(([label,v]) => `
    <div class="attendance-chart-row">
      <div class="attendance-chart-label">${escapeHtml(label)}</div>
      <div class="attendance-chart-track"><span class="attendance-chart-present" style="width:${(v.present/maxEvent)*100}%"></span><span class="attendance-chart-absent" style="width:${(v.absent/maxEvent)*100}%"></span><span class="attendance-chart-other" style="width:${(v.other/maxEvent)*100}%"></span></div>
      <strong>${v.total}</strong>
    </div>`).join("") : '<p class="empty">No attendance data for this selection.</p>';

  const trendCounts = new Map();
  rows.forEach(row => {
    const date = String(row.attendance_date ?? "").slice(0, 10);
    if (!date) return;
    const item = trendCounts.get(date) || { present: 0, absent: 0, total: 0 };
    const s = attendanceReportStatus(row).toLowerCase();
    if (s === "present") item.present++;
    if (s === "absent") item.absent++;
    item.total++;
    trendCounts.set(date, item);
  });
  const trendRows = [...trendCounts.entries()].sort((a,b) => a[0].localeCompare(b[0])).slice(-10);
  const maxTrend = Math.max(1, ...trendRows.map(([,v]) => v.total));
  const trendChart = trendRows.length ? trendRows.map(([date,v]) => `
    <div class="attendance-chart-row"><div class="attendance-chart-label">${escapeHtml(date)}</div><div class="attendance-chart-track"><span class="attendance-chart-present" style="width:${(v.present/maxTrend)*100}%"></span><span class="attendance-chart-absent" style="width:${(v.absent/maxTrend)*100}%"></span></div><strong>${v.total}</strong></div>`).join("") : '<p class="empty">No dated attendance data.</p>';

  const byOfficer = new Map();
  rows.forEach(row => {
    const key = String(row.member_id ?? row.memberId ?? attendanceReportName(row));
    const item = byOfficer.get(key) || { name: attendanceReportName(row), present: 0, absent: 0, late: 0, excused: 0, total: 0, records: [] };
    const s = attendanceReportStatus(row).toLowerCase();
    if (s === "present") item.present++;
    else if (s === "absent") item.absent++;
    else if (s === "late") item.late++;
    else if (s === "excused") item.excused++;
    item.total++;
    item.records.push(row);
    byOfficer.set(key, item);
  });
  const officers = [...byOfficer.values()].map(item => ({ ...item, rate: item.total ? item.present/item.total*100 : 0 }));
  const perfect = officers.filter(o => o.total > 0 && o.present === o.total).length;
  const repeatAbsence = officers.filter(o => o.absent >= 2);
  const mostPresent = [...officers].sort((a,b) => b.present-a.present)[0];
  const officerOptions = officers.map(o => `<option value="${escapeHtml(o.name)}">${escapeHtml(o.name)}</option>`).join("");

  const rowsHtml = rows.map(row => `
    <tr>
      <td>${escapeHtml(attendanceReportName(row))}</td>
      <td>${escapeHtml(attendanceReportEventName(row))}</td>
      <td>${escapeHtml(attendanceReportStatus(row))}</td>
      <td>${escapeHtml(row.remarks ?? "")}</td>
      <td>${escapeHtml(String(row.attendance_date ?? "").slice(0,10))}</td>
      <td>${escapeHtml(row.created_by ?? row.username ?? "")}</td>
      <td>${escapeHtml(row.created_at ?? "")}</td>
    </tr>`).join("");

  content.innerHTML = `
    <style>
      .attendance-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:18px 0}
      .attendance-kpi{border:1px solid var(--border-color,#d8e1ed);border-radius:12px;padding:14px;background:var(--card-bg,#fff)}
      .attendance-kpi small{display:block;color:var(--muted,#64748b);margin-bottom:6px}.attendance-kpi strong{font-size:25px}
      .attendance-analytics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:16px 0}
      .attendance-analytics-card{border:1px solid var(--border-color,#d8e1ed);border-radius:12px;padding:16px;background:var(--card-bg,#fff);min-width:0}
      .attendance-chart-row{display:grid;grid-template-columns:minmax(100px,1fr) 2fr 28px;gap:8px;align-items:center;margin:12px 0;font-size:13px}
      .attendance-chart-track{height:12px;background:#e8edf4;border-radius:20px;overflow:hidden;display:flex}.attendance-chart-present{background:#16a34a}.attendance-chart-absent{background:#dc2626}.attendance-chart-other{background:#eab308}
      .attendance-legend{font-size:12px;color:var(--muted,#64748b);display:flex;gap:12px;flex-wrap:wrap}.attendance-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
      .attendance-insight-list{padding-left:18px;margin-bottom:0}.attendance-insight-list li{margin:8px 0}.attendance-alert{padding:10px 12px;border-radius:9px;background:#fff7ed;border:1px solid #fed7aa;margin:8px 0}
      .attendance-report-toolbar{margin:14px 0}.attendance-report-toolbar .form-grid{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
      @media print{.attendance-report-toolbar,.report-actions,.no-print{display:none!important}.attendance-analytics-card,.attendance-kpi{break-inside:avoid}}
    </style>
    <div class="attendance-kpis">
      <div class="attendance-kpi"><small>Attendance entries</small><strong>${total}</strong></div>
      <div class="attendance-kpi"><small>Present</small><strong style="color:#16a34a">${present}</strong></div>
      <div class="attendance-kpi"><small>Absent</small><strong style="color:#dc2626">${absent}</strong></div>
      <div class="attendance-kpi"><small>Late</small><strong>${late}</strong></div>
      <div class="attendance-kpi"><small>Excused</small><strong>${excused}</strong></div>
      <div class="attendance-kpi"><small>Present rate</small><strong>${rate}%</strong></div>
    </div>
    <div class="attendance-analytics-grid">
      <section class="attendance-analytics-card"><h3>Attendance by event</h3><div class="attendance-legend"><span><i class="attendance-dot" style="background:#16a34a"></i>Present</span><span><i class="attendance-dot" style="background:#dc2626"></i>Absent</span><span><i class="attendance-dot" style="background:#eab308"></i>Other</span></div>${chart}</section>
      <section class="attendance-analytics-card"><h3>Attendance trend by date</h3><div class="attendance-legend"><span><i class="attendance-dot" style="background:#16a34a"></i>Present</span><span><i class="attendance-dot" style="background:#dc2626"></i>Absent</span></div>${trendChart}</section>
      <section class="attendance-analytics-card"><h3>Attendance insights</h3><ul class="attendance-insight-list">
        <li><strong>${officers.length}</strong> officers represented in the filtered records.</li>
        <li><strong>${perfect}</strong> officers have perfect attendance in this filtered view.</li>
        <li>${mostPresent ? `<strong>${escapeHtml(mostPresent.name)}</strong> has the most present records (${mostPresent.present}).` : "No officer attendance data available."}</li>
        <li><strong>${repeatAbsence.length}</strong> officers have two or more absences in this filtered view.</li>
        <li><strong>${excused}</strong> records are marked Excused and <strong>${absent}</strong> are marked Absent. Review remarks before deciding whether an absence is excused.</li>
      </ul>${repeatAbsence.slice(0,5).map(o => `<div class="attendance-alert"><strong>${escapeHtml(o.name)}</strong>: ${o.absent} absences recorded. Review remarks and follow up if needed.</div>`).join("")}</section>
    </div>
    <section class="attendance-analytics-card">
      <h3>Individual officer attendance history</h3>
      <div class="field"><label for="attendanceOfficerProfile">Select officer</label><select id="attendanceOfficerProfile"><option value="">Choose an officer</option>${officerOptions}</select></div>
      <div id="attendanceOfficerProfileResult"><p>Select an officer to view their attendance summary.</p></div>
    </section>
    <section class="attendance-analytics-card" style="margin-top:16px">
      <h3>Detailed attendance records (${total})</h3>
      <div class="table-wrap"><table class="report-table"><thead><tr><th>Officer</th><th>Event</th><th>Status</th><th>Remarks / reason</th><th>Attendance date</th><th>Created by</th><th>Created at</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="7">No attendance records found.</td></tr>'}</tbody></table></div>
      <div class="report-print-controls no-print"><button class="primary-btn" type="button" id="printAttendanceReport">Print / Save as PDF</button></div>
    </section>`;

  document.getElementById("attendanceOfficerProfile")?.addEventListener("change", renderAttendanceOfficerProfile);
  document.getElementById("printAttendanceReport")?.addEventListener(
    "click",
    printAttendanceReportDocument
);
}

function renderAttendanceOfficerProfile() {
  const select = document.getElementById("attendanceOfficerProfile");
  const target = document.getElementById("attendanceOfficerProfileResult");
  if (!select || !target) return;
  const name = select.value;
  if (!name) { target.innerHTML = "<p>Select an officer to view their attendance summary.</p>"; return; }
  const rows = attendanceReportFilteredRows.filter(row => attendanceReportName(row) === name).sort((a,b) => String(a.attendance_date).localeCompare(String(b.attendance_date)));
  const present = rows.filter(row => attendanceReportStatus(row).toLowerCase() === "present").length;
  const absent = rows.filter(row => attendanceReportStatus(row).toLowerCase() === "absent").length;
  const rate = rows.length ? (present / rows.length * 100).toFixed(1) : "0.0";
  let streak = 0, maxStreak = 0;
  rows.forEach(row => { streak = attendanceReportStatus(row).toLowerCase() === "absent" ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak); });
  target.innerHTML = `<div class="attendance-kpis"><div class="attendance-kpi"><small>Total events</small><strong>${rows.length}</strong></div><div class="attendance-kpi"><small>Present</small><strong>${present}</strong></div><div class="attendance-kpi"><small>Absent</small><strong>${absent}</strong></div><div class="attendance-kpi"><small>Attendance rate</small><strong>${rate}%</strong></div></div><p>Longest consecutive absence streak in this filtered view: <strong>${maxStreak}</strong></p><div class="table-wrap"><table class="report-table"><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(attendanceReportEventName(row))}</td><td>${escapeHtml(String(row.attendance_date ?? "").slice(0,10))}</td><td>${escapeHtml(attendanceReportStatus(row))}</td><td>${escapeHtml(row.remarks ?? "")}</td></tr>`).join("") || '<tr><td colspan="4">No records found.</td></tr>'}</tbody></table></div>`;
}

function printAttendanceReportDocument() {
    const rows = attendanceReportFilteredRows;

    const total = rows.length;
    const count = status =>
        rows.filter(row =>
            attendanceReportStatus(row).toLowerCase() === status.toLowerCase()
        ).length;

    const present = count("Present");
    const absent = count("Absent");
    const late = count("Late");
    const excused = count("Excused");

    const rate = total
        ? ((present / total) * 100).toFixed(1)
        : "0.0";

    // Group attendance by event
    const eventMap = new Map();

    rows.forEach(row => {
        const event = attendanceReportEventName(row);
        if (!eventMap.has(event)) {
            eventMap.set(event, {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: 0
            });
        }

        const item = eventMap.get(event);
        const status = attendanceReportStatus(row).toLowerCase();

        if (status === "present") item.present++;
        else if (status === "absent") item.absent++;
        else if (status === "late") item.late++;
        else if (status === "excused") item.excused++;

        item.total++;
    });

    // Group attendance by officer
    const officerMap = new Map();

    rows.forEach(row => {
        const name = attendanceReportName(row);

        if (!officerMap.has(name)) {
            officerMap.set(name, {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: 0
            });
        }

        const item = officerMap.get(name);
        const status = attendanceReportStatus(row).toLowerCase();

        if (status === "present") item.present++;
        else if (status === "absent") item.absent++;
        else if (status === "late") item.late++;
        else if (status === "excused") item.excused++;

        item.total++;
    });

    const officerCount = officerMap.size;
    const perfect = [...officerMap.values()].filter(
        officer => officer.total > 0 &&
        officer.present === officer.total
    ).length;

    const repeatAbsences = [...officerMap.entries()].filter(
        ([, officer]) => officer.absent >= 2
    );

const eventSections = [...eventMap.entries()].map(([eventName, summary], index) => {
    const eventRows = rows.filter(
        row => attendanceReportEventName(row) === eventName
    );

    const eventPresent = summary.present;
    const eventAbsent = summary.absent;
    const eventLate = summary.late;
    const eventExcused = summary.excused;
    const eventTotal = summary.total;

    const eventRate = eventTotal
        ? ((eventPresent / eventTotal) * 100).toFixed(1)
        : "0.0";

    const eventOfficers = new Map();

    eventRows.forEach(row => {
        const name = attendanceReportName(row);

        if (!eventOfficers.has(name)) {
            eventOfficers.set(name, {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: 0
            });
        }

        const officer = eventOfficers.get(name);
        const status = attendanceReportStatus(row).toLowerCase();

        if (status === "present") officer.present++;
        else if (status === "absent") officer.absent++;
        else if (status === "late") officer.late++;
        else if (status === "excused") officer.excused++;

        officer.total++;
    });

    const officerTable = [...eventOfficers.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, officer]) => `
            <tr>
                <td>${escapeHtml(name)}</td>
                <td>${officer.present}</td>
                <td>${officer.absent}</td>
                <td>${officer.late}</td>
                <td>${officer.excused}</td>
                <td>${officer.total}</td>
                <td>${((officer.present / officer.total) * 100).toFixed(1)}%</td>
            </tr>
        `).join("");

    const detailTable = eventRows.map(row => `
        <tr>
            <td>${escapeHtml(attendanceReportName(row))}</td>
            <td>${escapeHtml(attendanceReportStatus(row))}</td>
            <td>${escapeHtml(row.remarks ?? "—")}</td>
            <td>${escapeHtml(String(row.attendance_date ?? "").slice(0, 10))}</td>
        </tr>
    `).join("");

    const event = attendanceReportEvents.find(item =>
        (item.title ?? item.event_name ?? item.eventName) === eventName
    );

    const eventDate = event?.event_date
        ? String(event.event_date).slice(0, 10)
        : "Not specified";

    return `
        <section class="event-report">
            <h2>EVENT ${index + 1}: ${escapeHtml(eventName)}</h2>

            <p><strong>Event Date:</strong> ${escapeHtml(eventDate)}</p>

            <h3>Attendance Summary</h3>

            <table>
                <tr><th>Description</th><th>Count</th></tr>
                <tr><td>Total Attendance Entries</td><td>${eventTotal}</td></tr>
                <tr><td>Present</td><td>${eventPresent}</td></tr>
                <tr><td>Absent</td><td>${eventAbsent}</td></tr>
                <tr><td>Late</td><td>${eventLate}</td></tr>
                <tr><td>Excused</td><td>${eventExcused}</td></tr>
                <tr><td>Present Rate</td><td>${eventRate}%</td></tr>
            </table>

            <h3>Officer Attendance Records</h3>

            <table>
                <thead>
                    <tr>
                        <th>Officer Name</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                        <th>Excused</th>
                        <th>Total</th>
                        <th>Present Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${officerTable}
                </tbody>
            </table>

            <h3>Detailed Attendance</h3>

            <table>
                <thead>
                    <tr>
                        <th>Officer Name</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Attendance Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailTable}
                </tbody>
            </table>

            <h3>Event Analysis</h3>

            <p>
                For ${escapeHtml(eventName)}, ${eventPresent} attendance
                entries were marked Present, ${eventAbsent} Absent,
                ${eventLate} Late, and ${eventExcused} Excused.
                The event recorded a present rate of ${eventRate}%.
            </p>
        </section>
    `;
}).join("");

    const eventRows = [...eventMap.entries()].map(([name, item]) => `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td>${item.present}</td>
            <td>${item.absent}</td>
            <td>${item.late}</td>
            <td>${item.excused}</td>
            <td>${item.total}</td>
        </tr>
    `).join("");

    const officerRows = [...officerMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, item]) => `
            <tr>
                <td>${escapeHtml(name)}</td>
                <td>${item.present}</td>
                <td>${item.absent}</td>
                <td>${item.late}</td>
                <td>${item.excused}</td>
                <td>${item.total}</td>
                <td>${((item.present / item.total) * 100).toFixed(1)}%</td>
            </tr>
        `).join("");

    const detailRows = rows.map(row => `
        <tr>
            <td>${escapeHtml(attendanceReportName(row))}</td>
            <td>${escapeHtml(attendanceReportEventName(row))}</td>
            <td>${escapeHtml(attendanceReportStatus(row))}</td>
            <td>${escapeHtml(row.remarks ?? "—")}</td>
            <td>${escapeHtml(String(row.attendance_date ?? "").slice(0, 10))}</td>
        </tr>
    `).join("");

    const eventFilter =
        document.getElementById("attendanceReportEvent");
    const statusFilter =
        document.getElementById("attendanceReportStatus");

    const selectedEvent = eventFilter?.selectedOptions[0]?.textContent;
    const selectedStatus = statusFilter?.value;

    const fromDate =
        document.getElementById("attendanceReportFrom")?.value;
    const toDate =
        document.getElementById("attendanceReportTo")?.value;

    const officerSearch =
        document.getElementById("attendanceReportOfficer")?.value;

    const filters = [
        selectedEvent && eventFilter.value
            ? `Event: ${escapeHtml(selectedEvent)}`
            : "",
        selectedStatus
            ? `Status: ${escapeHtml(selectedStatus)}`
            : "",
        fromDate ? `From: ${escapeHtml(fromDate)}` : "",
        toDate ? `To: ${escapeHtml(toDate)}` : "",
        officerSearch
            ? `Officer: ${escapeHtml(officerSearch)}`
            : ""
    ].filter(Boolean).join(" | ") || "All attendance records";

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        showToast("Please allow pop-ups to print the report.");
        return;
    }

    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CSS Attendance Report</title>

            <style>
                @page {
                    size: A4;
                    margin: 20mm;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #222;
                    font-size: 11pt;
                    line-height: 1.5;
                }

                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 2px solid #222;
                    padding-bottom: 15px;
                }

                .header h1 {
                    font-size: 19px;
                    margin: 0;
                }

                .header h2 {
                    font-size: 16px;
                    margin: 5px 0;
                }

                .header p {
                    margin: 3px;
                    font-size: 10px;
                }

                h3 {
                    font-size: 14px;
                    margin-top: 24px;
                    margin-bottom: 8px;
                }

                p {
                    text-align: justify;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 12px 0 20px;
                    font-size: 9pt;
                }

                th, td {
                    border: 1px solid #777;
                    padding: 7px;
                    text-align: left;
                    vertical-align: top;
                }

                th {
                    background: #e8edf4;
                    font-weight: bold;
                }

                .summary-table td:first-child {
                    width: 65%;
                    font-weight: bold;
                }

                .filter-info {
                    font-size: 10px;
                    font-style: italic;
                }

                .signature {
                    margin-top: 55px;
                    display: flex;
                    justify-content: space-between;
                    gap: 50px;
                }

                .signature div {
                    width: 45%;
                    text-align: center;
                }

                .signature-line {
                    border-top: 1px solid #222;
                    padding-top: 6px;
                    margin-top: 35px;
                }

                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 9px;
                }

                thead {
                    display: table-header-group;
                }

                tr {
                    break-inside: avoid;
                }

                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>

        <body>
            <div class="header">
                <h1>CYBER SMART SOCIETY</h1>
                <h2>ATTENDANCE REPORT</h2>
                <p>CSS Organization Management System</p>
                <p>Date Generated: ${new Date().toLocaleString()}</p>
            </div>

            <h3>I. INTRODUCTION</h3>
            <p>
                This report presents the attendance records of the
                Cyber Smart Society officers. It provides a summary
                of attendance participation, including the number of
                present, absent, late, and excused records. It also
                provides an overview of attendance by event and by
                individual officer for organizational monitoring
                and documentation.
            </p>

            <h3>II. REPORT COVERAGE</h3>
            <p>
                <strong>Applied filters:</strong>
                ${filters}
            </p>
            <p>
                This report covers ${total} attendance entries
                involving ${officerCount} officers across
                ${eventMap.size} events.
            </p>

           <h3>III. EVENT-BY-EVENT ATTENDANCE REPORT</h3>

<p>
    The following sections present the attendance results
    separately for each organization event.
</p>

${eventSections || "<p>No event attendance records available.</p>"}

<h3>IV. GENERAL CONCLUSION</h3>

<p>
    The event-by-event attendance results provide a basis for
    evaluating officer participation in each organizational
    activity. These records may be used for documentation,
    monitoring, and future organizational planning.
</p>
            <h3>IV. ATTENDANCE SUMMARY BY EVENT</h3>

            <table>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                        <th>Excused</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${eventRows || '<tr><td colspan="6">No records available.</td></tr>'}
                </tbody>
            </table>

            <h3>V. ATTENDANCE SUMMARY BY OFFICER</h3>

            <table>
                <thead>
                    <tr>
                        <th>Officer Name</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Late</th>
                        <th>Excused</th>
                        <th>Total</th>
                        <th>Present Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${officerRows || '<tr><td colspan="7">No records available.</td></tr>'}
                </tbody>
            </table>

            <h3>VI. ATTENDANCE ANALYSIS AND OBSERVATIONS</h3>

            <p>
                Based on the filtered attendance records, the organization
                recorded ${present} present entries out of ${total}
                total entries, resulting in a present rate of ${rate}%.
                There were ${absent} absences, ${late} late entries,
                and ${excused} excused entries.
            </p>

            <p>
                A total of ${perfect} officers recorded perfect attendance
                in the selected records. Meanwhile, ${repeatAbsences.length}
                officers had two or more recorded absences.
            </p>

            <p>
                The attendance records may be used to identify participation
                patterns, review attendance concerns, and support future
                organizational planning. Remarks and supporting information
                should be reviewed when evaluating absences.
            </p>

            <h3>VII. DETAILED ATTENDANCE RECORDS</h3>

            <table>
                <thead>
                    <tr>
                        <th>Officer Name</th>
                        <th>Event</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Attendance Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailRows || '<tr><td colspan="5">No records available.</td></tr>'}
                </tbody>
            </table>

            <h3>VIII. CONCLUSION</h3>
            <p>
                This report provides a documented overview of officer
                attendance within the selected reporting period and filters.
                The information may serve as a reference for monitoring
                participation, maintaining organizational records, and
                improving attendance management.
            </p>

            <div class="signature">
                <div>
                    <div class="signature-line">
                        Prepared by
                    </div>
                </div>

                <div>
                    <div class="signature-line">
                        Noted by
                    </div>
                </div>
            </div>

            <div class="footer">
                Cyber Smart Society | Attendance Report
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);

    reportWindow.document.close();
}


function exportAttendanceReportCsv() {
  const columns = ["member_name", "event_name", "attendance_status", "remarks", "attendance_date", "created_by", "created_at"];
  const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [columns.map(quote).join(",")];
  attendanceReportFilteredRows.forEach(row => lines.push([
    attendanceReportName(row), attendanceReportEventName(row), attendanceReportStatus(row), row.remarks,
    row.attendance_date, row.created_by ?? row.username, row.created_at
  ].map(quote).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CSS_Attendance_Report_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// =========================================
// DASHBOARD TEXT-TO-SPEECH AND VOICE NAVIGATION
// =========================================

function speak(message) {
  if (!("speechSynthesis" in window)) {
    showToast("Text-to-speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-PH";
  utterance.rate = 0.95;

  window.speechSynthesis.speak(utterance);
}

function startVoice() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showToast(
      "Speech recognition is not supported in this browser. Try Chrome or Edge."
    );
    return;
  }

  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch {
      // Recognition may already have ended.
    }
  }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = "en-PH";
  voiceRecognition.interimResults = false;
  voiceRecognition.maxAlternatives = 1;

  const status = document.getElementById("voiceStatus");

  if (status) status.textContent = "Listening...";

  voiceRecognition.onresult = event => {
    const heard = event.results[0][0].transcript.toLowerCase();

    if (status) status.textContent = `Heard: ${heard}`;

    handleVoiceCommand(heard);
  };

  voiceRecognition.onerror = event => {
    if (status) {
      status.textContent = `Voice error: ${event.error}`;
    }

    console.error("Dashboard voice error:", event.error);
  };

  voiceRecognition.onend = () => {
    voiceRecognition = null;
  };

  try {
    voiceRecognition.start();
  } catch (error) {
    if (status) {
      status.textContent = "Unable to start voice recognition.";
    }

    console.error(error);
    voiceRecognition = null;
  }
}

function handleVoiceCommand(text) {
  const commands = [
    ["dashboard", ["dashboard", "home", "balik sa dashboard"]],
    ["members", ["members", "member", "show members", "lista sa miyembro", "mga miyembro"]],
    ["officers", ["officers", "officer", "mga opisyal"]],
    ["users", ["user management", "manage users", "mga user"]],
    ["attendance", ["attendance", "present", "attendance records", "talaan sa attendance"]],
    ["events", ["events", "event", "activities", "mga kalihokan"]],
    ["finance", ["finance", "financial", "expenses", "income", "kwarta"]],
    ["reports", ["reports", "report", "mga report"]],
    ["reports", ["reports", "report", "mga report"]]
  ];

  for (const [page, words] of commands) {
    if (words.some(word => text.includes(word))) {
      navigate(page);

      const message =
        `Opening ${MODULES[page]?.title || page}.`;

      if (localStorage.getItem("a11y_readAloud") === "true") {
        speak(message);
      }

      return;
    }
  }

  if (text.includes("log out") || text.includes("logout")) {
    speak(
      "Do you want to log out? Please use the logout button to confirm."
    );
    return;
  }

  const message = "Sorry, I did not recognize that command.";

  if (localStorage.getItem("a11y_readAloud") === "true") {
    speak(message);
  }

  showToast(message);
}

// =========================================
// GLOBAL ON-DEMAND HOVER / KEYBOARD VOICE ASSISTANCE
// =========================================

function getCurrentPageName() {
  // The dashboard uses a single-page navigation system, so #pageTitle
  // is the most reliable source for the page currently being displayed.
  const dashboardTitle = document.getElementById("pageTitle");

  if (dashboardTitle && dashboardTitle.textContent.trim()) {
    return dashboardTitle.textContent.trim();
  }

  // For standalone pages, use the visible main heading when available.
  const heading = document.querySelector(
    "main h1, #pageContent h1, .page-header h1, h1"
  );

  if (heading && heading.textContent.trim()) {
    return heading.textContent.trim();
  }

  // Last fallback: derive a readable name from the current HTML filename.
  const file = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop() || "";

  const name = file.replace(/\.html?$/i, "").replace(/[-_]+/g, " ");

  if (!name || name.toLowerCase() === "index") {
    return "Sign In";
  }

  const names = {
    dashboard: "Dashboard",
    login: "Sign In",
    register: "Registration",
    members: "Members",
    officers: "Officers",
    attendance: "Attendance",
    events: "Events",
    finance: "Membership Fees",
    reports: "Reports",
    settings: "Settings"
  };

  return names[name.toLowerCase()] ||
    name.replace(/\b\w/g, letter => letter.toUpperCase());
}

function getVoiceDescription(element) {
  if (!element || element.disabled || element.getAttribute("aria-hidden") === "true") return "";
  if (element.dataset?.voice) return element.dataset.voice.trim();

  // If the pointer is over a label, resolve it to the associated form control.
  if (element.tagName?.toLowerCase() === "label") {
    const labelledControl = element.control ||
      (element.htmlFor ? document.getElementById(element.htmlFor) : null) ||
      element.querySelector("input, textarea, select");
    if (labelledControl) element = labelledControl;
  }

  const tag = element.tagName.toLowerCase();
  const type = (element.getAttribute("type") || "").toLowerCase();

  // Never read a password or any value typed by the user.
  if (tag === "input" && type === "password") {
    return "Password field. Enter your password privately. The system will not read your password aloud.";
  }

  let label = element.getAttribute("aria-label") || element.getAttribute("title") || "";

  // Support aria-labelledby in addition to aria-label.
  if (!label) {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      label = labelledBy.split(/\s+/)
        .map(id => document.getElementById(id)?.innerText || "")
        .filter(Boolean)
        .join(" ");
    }
  }

  if (!label && element.id) {
    const linked = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (linked) label = linked.innerText;
  }
  if (!label) {
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) {
      label = wrappingLabel.innerText
        .replace(element.getAttribute("placeholder") || "\u0000", "");
    }
  }

  if (!label && tag === "input") {
    label = element.getAttribute("placeholder") || element.name || "Input field";
  }
  if (!label && (tag === "textarea" || tag === "select")) {
    label = element.getAttribute("placeholder") || element.name ||
      (tag === "select" ? "Selection field" : "Text area");
  }

  // Deliberately do not use element.value: it may contain private user input.
  if (!label) label = (element.innerText || "").trim();
  label = label.replace(/\s+/g, " ").trim();
  if (!label) return "";

  if (tag === "button" || element.getAttribute("role") === "button") return `${label}. Button.`;
  if (tag === "a") return `${label}. Link.`;
  if (tag === "select") return `${label}. Selection field. Use the arrow keys to choose an option.`;
  if (tag === "textarea") return `${label}. Text area. Type your response here.`;
  if (tag === "input" && type !== "submit" && type !== "button") return `${label}. Input field.`;
  return label;
}

function speakOnDemand(message) {
  if (!message || localStorage.getItem("a11y_hoverVoiceEnabled") !== "true") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "en-PH";
  utterance.rate = 1.4;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function initOnDemandVoiceAssistance() {
  if (!document.body || document.getElementById("globalVoiceAssistToggle")) return;

  const style = document.createElement("style");
  style.id = "globalVoiceAssistStyles";
  style.textContent = `
    #globalVoiceAssistToggle { position:fixed; right:20px; top:108px; z-index:99999;
      border:2px solid #67e8f9; border-radius:999px; padding:12px 18px;
      background:#fff; color:#172338; font:600 14px/1.2 Arial,sans-serif;
      box-shadow:0 6px 22px rgba(0,0,0,.28); cursor:pointer; }
    #globalVoiceAssistToggle:focus-visible { outline:3px solid #facc15; outline-offset:4px; }
    #globalVoiceAssistToggle[aria-pressed="true"] { background:#075985; border-color:#a5f3fc; }
    #globalVoiceAssistStatus { position:fixed; right:20px; top:156px; z-index:99999;
      max-width:min(340px, calc(100vw - 40px)); padding:8px 12px; border-radius:8px;
      background:#fff; color:#172338; font:13px Arial,sans-serif; border:1px solid #d8e1ec; }
    #globalVoiceAssistStatus:empty { display:none; }
    @media (max-width:600px) { #globalVoiceAssistToggle { right:12px; top:100px; } #globalVoiceAssistStatus { right:12px; top:148px; } }
  `;
  document.head.appendChild(style);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "globalVoiceAssistToggle";
  toggle.setAttribute("aria-pressed", "false");
  toggle.setAttribute("aria-label", "Activate voice assistance");
  toggle.textContent = "🔊 Voice assistance: OFF";

  const status = document.createElement("div");
  status.id = "globalVoiceAssistStatus";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  document.body.append(toggle, status);

  function setEnabled(enabled, announce = true) {
    localStorage.setItem("a11y_hoverVoiceEnabled", String(enabled));
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.setAttribute("aria-label", enabled ? "Deactivate voice assistance" : "Activate voice assistance");
    toggle.textContent = enabled ? "🔊 Voice assistance: ON" : "🔊 Voice assistance: OFF";
    status.textContent = enabled
      ? "Voice assistance is on. Hover over or keyboard-focus a control to hear its description."
      : "Voice assistance is off.";
    if (enabled && announce) {
      const pageName = getCurrentPageName();

      speakOnDemand(
        `Welcome to the CSS Organization Management System. ` +
        `You are currently on the ${pageName} page. ` +
        `Voice assistance is now activated. ` +
        `Move your pointer over a field label, button, link, or form control, ` +
        `or use the Tab key to hear its label and instructions. ` +
        `Your password and typed information will never be read aloud.`
      );
    }
    if (!enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  toggle.addEventListener("click", () => {
    const enabled = localStorage.getItem("a11y_hoverVoiceEnabled") !== "true";
    setEnabled(enabled, true);
  });

  const initiallyEnabled = localStorage.getItem("a11y_hoverVoiceEnabled") === "true";
  setEnabled(initiallyEnabled, false);

  let lastSpokenElement = null;
  function handleElement(element) {
    if (!element || element === toggle || element === status) return;
    if (element === lastSpokenElement) return;
    const description = getVoiceDescription(element);
    if (!description) return;
    lastSpokenElement = element;
    speakOnDemand(description);
  }

  // Read typed text after a short pause. Passwords are always excluded.
  // A per-field timer prevents speech from restarting on every keystroke.
  const typingSpeechTimers = new WeakMap();
  const typingSpeechSelector =
    "input:not([type='password']):not([type='hidden']):not([type='file']), textarea, [contenteditable='true']";

  const voiceTargetSelector =
    "button, a, input, textarea, select, label, [role='button'], [tabindex]:not([tabindex='-1']), h1, h2, h3, h4, p, li, th, td, .stat-card span, .stat-card strong, .eyebrow";

  document.addEventListener("pointerover", event => {
    if (event.pointerType === "touch") return;
    const target = event.target instanceof Element ? event.target : null;
    const element = target?.closest(voiceTargetSelector);
    if (element && !element.contains(event.relatedTarget)) {
      handleElement(element);
    }
  });

  document.addEventListener("focusin", event => {
    const target = event.target instanceof Element ? event.target : null;
    const element = target?.closest(voiceTargetSelector);
    if (element) {
      lastSpokenElement = null;
      handleElement(element);
    }
  });

  document.addEventListener("pointerout", event => {
    if (event.target === lastSpokenElement || event.target.contains(lastSpokenElement)) lastSpokenElement = null;
  });
}

// =========================================
// APPLICATION STARTUP
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  initOnDemandVoiceAssistance();
  initAuthPage();

  if (document.getElementById("pageContent")) {
    initDashboard();
  }
});
