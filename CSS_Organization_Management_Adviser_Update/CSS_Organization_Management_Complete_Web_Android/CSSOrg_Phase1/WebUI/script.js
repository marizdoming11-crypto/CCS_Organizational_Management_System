const API = "http://localhost:5151/api";

// Central API helper: attaches the access token to authenticated requests.
async function apiFetch(url, options = {}) {
    const token = JSON.parse(localStorage.getItem("user") || "null")?.token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
}

let selectedId = null;
 let selectedOfficerId = null;
/* ================= AUTH ================= */

/* LOGIN */
async function login() {
    try {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            alert("Fill all fields");
            return;
        }

        const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Login failed");

        localStorage.setItem("user", JSON.stringify({ ...data.user, token: data.token }));
        window.location.href = "dashboard.html";

    } catch (err) {
        alert(err.message);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const register = document.getElementById("registerBtn");

    if (register) {
        register.addEventListener("click", () => {
            window.location.href = "register.html";
        });
    }
});

/* REGISTER */
async function register() {
    try {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
            alert("Fill all fields");
            return;
        }

        const res = await fetch(`${API}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message || "Register failed");

        alert("Registered successfully");
        window.location.href = "index.html";

    } catch (err) {
        alert(err.message);
    }
}

/* ================= SIDEBAR ================= */

function loadPage(page) {
    const content = document.getElementById("content");
    if (!content) return;

    content.innerHTML = "";

    if (page === "dashboard") {
        content.innerHTML = `
             <div class="dashboard-card">

                <h2 class="glow">Dashboard</h2>
                <p class="subtitle">Welcome to CSS Organization</p>

                <p class="description">
                    The CSS Organization is a community of students dedicated to innovation,
                    technology, and collaboration. This system allows officers to manage members,
                    reports, and organizational activities efficiently.
                </p>

                <div class="platforms">
                    <div class="platform">🌐 Website</div>
                    <div class="platform">📘 Facebook</div>
                    <div class="platform">📸 Instagram</div>
                </div>

            </div>
        `;
    }

    if (page === "addMember") {
        content.innerHTML = `
            <div class="add-member-container">

                <div class="form-section">
                    <h2>Add Member</h2>

                    <input id="name" placeholder="Full Name">
                    <input id="year" placeholder="Year & Section">
                    <input id="address" placeholder="Address">
                    <input id="contact" placeholder="Contact Number">

                    <button id="submitBtn">Submit</button>
                </div>

                <div class="table-section">
                    <h2>Members</h2>

                    <div class="search-box">
                        <input id="searchInput" placeholder="Search by name...">
                        <button id="searchBtn">Search</button>
                    </div>

                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Year</th>
                                    <th>Address</th>
                                    <th>Contact</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="memberTable"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;

        document.getElementById("submitBtn").addEventListener("click", addMember);
        document.getElementById("searchBtn").addEventListener("click", searchMembers);

        loadMembers();
    }

   if (page === "reports") {
    const content = document.getElementById("content");

    content.innerHTML = `
        <div class="reports-container">

            <h2 class="glow">Reports Dashboard</h2>

            <div class="report-cards">
                <div class="report-card">👥 Members: <span id="totalMembers">--</span></div>
                <div class="report-card">🧑‍💼 Officers: <span id="totalOfficers">--</span></div>
                <div class="report-card">📊 Reports: <span id="totalReports">--</span></div>
            </div>

            <div class="report-filters">
                <input type="date" id="startDate">
                <input type="date" id="endDate">

                <select id="reportType">
                    <option value="officers">Officers</option>
                     <option value="members">Members</option>
                </select>

                <button onclick="generateReport()">Generate</button>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody id="reportTable">
                    <tr><td colspan="3">No data yet</td></tr>
                </tbody>
            </table>

        </div>
    `;

    loadReportSummary();
}

    if (page === "officers") {
        content.innerHTML = `<div class="officer-container">

    <!-- FORM -->
    <div class="form-section">

    <h2>Add Officer</h2>

    <input id="fullName" type="text" placeholder="Full Name" required>
    <input id="position" type="text" placeholder="Position" required>
    <input id="email" type="email" placeholder="Email" required>
    <input id="contact" type="text" placeholder="Contact Number" required>

    <!-- 🔥 IMAGE INPUT -->
    <input type="file" id="imageFile" accept="image/*">

    <!-- 🔥 BUTTON (IMPORTANT) -->
    <button id="submitBtn" onclick="saveOfficer()">Submit</button>

</div>

    <!-- TABLE -->
    <div class="table-section">
        <h2>Officers</h2>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Image</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="officerTable"></tbody>
            </table>
        </div>
    </div>

</div>`;
setTimeout(() => {
        const btn = document.getElementById("officerBtn");
        if (btn) {
            btn.addEventListener("click", saveOfficer);
        }
    }, 0);
     loadOfficers();
    }

    if (page === "users") {
        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        if (currentUser?.role !== "Admin") {
            content.innerHTML = "<p>Access denied. Administrator permission is required.</p>";
            return;
        }

        content.innerHTML = `
            <section class="form-section" style="max-width:100%;padding:24px;">
                <h2>User Management</h2>
                <p>Manage registered accounts, roles and account access.</p>
                <button id="refreshUsersBtn" type="button">Refresh Users</button>
                <div class="table-container" style="margin-top:18px;overflow-x:auto;">
                    <table>
                        <thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead>
                        <tbody id="usersTable"><tr><td colspan="6">Loading...</td></tr></tbody>
                    </table>
                </div>
                <p id="usersMessage" role="status" aria-live="polite"></p>
            </section>`;
        document.getElementById("refreshUsersBtn").addEventListener("click", loadUsers);
        loadUsers();
    }
}

/* ================= SIDEBAR EVENTS ================= */

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    const userNav = document.getElementById("userManagementNav");

    // Roles in the JWT response are stored in localStorage as data.user.role.
    // Normalize the value to avoid casing/whitespace mismatches.
    const role = String(currentUser?.role || "").trim().toLowerCase();
    if (userNav) userNav.hidden = role !== "admin";

    document.querySelectorAll("#sidebarMenu li[data-page]").forEach(item => {
        item.addEventListener("click", () => {
            if (item.hidden) return;
            document.querySelectorAll("#sidebarMenu li").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            loadPage(item.dataset.page);
        });
    });

    const logoutItem = document.querySelector('#sidebarMenu li[data-action="logout"]');
    if (logoutItem) {
        logoutItem.addEventListener("click", () => logout());
    }

    loadPage("dashboard");
});

/* ================= LOGOUT ================= */

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

/* ================= MEMBERS ================= */

/* LOAD */
async function loadMembers() {
    try {
        const res = await apiFetch(`${API}/member/all`);
        const data = await res.json();

        console.log("API DATA:", data); // 🔥 DEBUG

        renderTable(data);
    } catch (err) {
        console.error(err);
    }
}

/* RENDER */
function renderTable(members) {
    const table = document.getElementById("memberTable");
    if (!table) return;

    table.innerHTML = "";

    members.forEach(member => {

        // 🔥 SAFE FIELD MAPPING
        const contact =
            member.contactNumber ??
            member.contact ??
            member.phone ??
            member.contact_number ??
            "";

        const row = `
            <tr>
                <td>${member.name ?? ""}</td>
                <td>${member.yearSection ?? ""}</td>
                <td>${member.address ?? ""}</td>
                <td>${contact}</td>
                <td>
                    <button class="edit-btn" onclick='editMember(${JSON.stringify(member)})'>Edit</button>
                    <button class="delete-btn" onclick="deleteMember(${member.id})">Delete</button>
                </td>
            </tr>
        `;

        table.innerHTML += row;
    });
}

/* EDIT */
function editMember(member) {
    selectedId = member.id;

    document.getElementById("name").value = member.name ?? "";
    document.getElementById("year").value = member.yearSection ?? "";
    document.getElementById("address").value = member.address ?? "";
    document.getElementById("contact").value =
        member.contactNumber ??
        member.contact ??
        "";

    document.getElementById("submitBtn").innerText = "Update";
}

/* ADD / UPDATE */
async function addMember() {

    const name = document.getElementById("name").value.trim();
    const year = document.getElementById("year").value.trim();
    const address = document.getElementById("address").value.trim();
    const contact = document.getElementById("contact").value.trim();

    if (!name || !year || !address || !contact) {
        alert("Fill all fields");
        return;
    }

    try {

        const url = selectedId
            ? `${API}/member/update/${selectedId}`
            : `${API}/member/add-member`;

        const method = selectedId ? "PUT" : "POST";

        const res = await apiFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                yearSection: year,
                address,
                contactNumber: contact
            })
        });

        if (!res.ok) throw new Error("Save failed");

        // RESET
        document.getElementById("name").value = "";
        document.getElementById("year").value = "";
        document.getElementById("address").value = "";
        document.getElementById("contact").value = "";

        selectedId = null;
        document.getElementById("submitBtn").innerText = "Submit";

        loadMembers();

    } catch (err) {
        alert(err.message);
    }
}

/* DELETE */
async function deleteMember(id) {
    if (!confirm("Delete this member?")) return;

    try {
        const res = await apiFetch(`${API}/member/delete/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Delete failed");

        loadMembers();

    } catch (err) {
        alert(err.message);
    }
}

/* SEARCH */
function searchMembers() {
    const value = document.getElementById("searchInput").value.toLowerCase();
    const rows = document.querySelectorAll("#memberTable tr");

    rows.forEach(row => {
        const name = row.children[0].innerText.toLowerCase();
        row.style.display = name.includes(value) ? "" : "none";
    });
}
async function loadOfficers() {
    try {
        const res = await apiFetch(`${API}/officer/all`);
        const data = await res.json();

        console.log("OFFICERS:", data); // debug

        renderOfficers(data);
    } catch (err) {
        console.error("LOAD OFFICERS ERROR:", err);
    }
}
function renderOfficers(officers) {
    const table = document.getElementById("officerTable");
    table.innerHTML = "";

    officers.forEach(o => {

        // ✅ FIXED IMAGE URL
        const imageUrl = o.profileImage
            ? `http://localhost:5151/officers/${o.profileImage}`
            : "https://via.placeholder.com/45";

        table.innerHTML += `
            <tr>
                <td>${o.name ?? ""}</td>
                <td>${o.position ?? ""}</td>
                <td>${o.email ?? ""}</td>
                <td>${o.contact ?? ""}</td>

                <!-- ✅ FIXED IMAGE COLUMN -->
                <td>
                    <img 
                        src="${imageUrl}" 
                        alt="profile"
                        class="officer-img"
                        onerror="this.onerror=null; this.src='https://via.placeholder.com/45';"
                    >
                </td>

                <td>
                    <button class="edit-btn"
        onclick='editOfficer(${JSON.stringify(o)})'>
        Edit
    </button>


                    <button class="delete-btn"
                        onclick="deleteOfficer(${o.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}
function editOfficer(o) {
    selectedOfficerId = o.id;

    document.getElementById("fullName").value = o.name || "";
    document.getElementById("position").value = o.position || "";
    document.getElementById("email").value = o.email || "";
    document.getElementById("contact").value = o.contact || "";

    document.getElementById("submitBtn").innerText = "Update";
}
 
async function saveOfficer() {

    const name = document.getElementById("fullName").value.trim();
    const position = document.getElementById("position").value.trim();
    const email = document.getElementById("email").value.trim();
    const contact = document.getElementById("contact").value.trim();
    const fileInput = document.getElementById("imageFile");

    // 🔥 HARD VALIDATION (prevents blank row issue)
    if (!name || !position || !email || !contact) {
        alert("All fields are required");
        return;
    }

    try {

        let res;
if (selectedOfficerId) {

    console.log("Updating officer:", selectedOfficerId);

    const formData = new FormData();

    formData.append("Name", name);
    formData.append("Position", position);
    formData.append("Email", email);
    formData.append("Contact", contact);

    // ✅ optional image update
    if (fileInput.files.length > 0) {
        formData.append("Image", fileInput.files[0]);
    }

    res = await apiFetch(`${API}/officer/update/${selectedOfficerId}`, {
        method: "PUT",
        body: formData
    });

}

        else {

           // ✅ ADD (FormData)
const formData = new FormData();

formData.append("Name", name);
formData.append("Position", position);
formData.append("Email", email);
formData.append("Contact", contact);

// 🔥 REQUIRE REAL IMAGE
if (fileInput.files.length === 0) {
    alert("Please select an image");
    return;
}

formData.append("Image", fileInput.files[0]);

res = await apiFetch(`${API}/officer/add`, {
    method: "POST",
    body: formData
});
        }

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }

        // ✅ RESET FORM
        document.getElementById("fullName").value = "";
        document.getElementById("position").value = "";
        document.getElementById("email").value = "";
        document.getElementById("contact").value = "";
        document.getElementById("imageFile").value = "";

        selectedOfficerId = null;
        document.getElementById("submitBtn").innerText = "Submit";

        loadOfficers();

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
    }
}
async function deleteOfficer(id) {
    if (!confirm("Delete this officer?")) return;

    try {
        const res = await apiFetch(`${API}/officer/delete/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            throw new Error("Delete failed");
        }

        loadOfficers();

    } catch (err) {
        console.error("DELETE ERROR:", err);
        alert(err.message);
    }
}
async function generateReport() {

    const type = document.getElementById("reportType").value;
    const start = document.getElementById("startDate").value || null;
    const end = document.getElementById("endDate").value || null;

    try {

        const res = await apiFetch(`${API}/report/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Type: type,
                StartDate: start,
                EndDate: end
            })
        });

        if (!res.ok)
        {
            const err = await res.text();
            throw new Error(err);
        }

        const data = await res.json();

        renderReportTable(data);

    }
    catch (err)
    {
        console.error(err);
        alert("Error generating report:\n" + err.message);
    }
}

function renderReportTable(data) {

    const table = document.getElementById("reportTable");
    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="3">No data found</td></tr>`;
        return;
    }

    data.forEach(r => {

        if (!r) return; // 🔥 prevents blank rows

        table.innerHTML += `
            <tr>
                <td>${r.name || ""}</td>
                <td>${r.type || ""}</td>
                <td>${r.date || ""}</td>
            </tr>
        `;
    });
}
async function loadReportSummary() {
    try {
        const res = await apiFetch(`${API}/report/summary`);
        const data = await res.json();

        document.getElementById("totalMembers").innerText = data.members;
        document.getElementById("totalOfficers").innerText = data.officers;
        document.getElementById("totalReports").innerText = data.reports;

    } catch (err) {
        console.error(err);
    }
}

/* ================= USER / ROLE MANAGEMENT ================= */
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
}

async function loadUsers() {
    const table = document.getElementById("usersTable");
    if (!table) return;
    table.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    try {
        const response = await apiFetch(`${API}/user/all`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Unable to load users (${response.status}).`);

        const currentUser = JSON.parse(localStorage.getItem("user") || "null");
        const roles = ["Admin", "Governor", "Secretary", "Treasurer", "Member"];
        table.innerHTML = data.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>
                    <select id="role-${user.id}" aria-label="Role for ${escapeHtml(user.username)}">
                        ${roles.map(role => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
                    </select>
                </td>
                <td>${user.isActive ? "Active" : "Inactive"}</td>
                <td>${escapeHtml(user.createdAt)}</td>
                <td>
                    <button type="button" onclick="saveUserRole(${user.id})">Save Role</button>
                    <button type="button" onclick="toggleUserStatus(${user.id}, ${!user.isActive})">
                        ${user.isActive ? "Deactivate" : "Activate"}
                    </button>
                </td>
            </tr>`).join("") || '<tr><td colspan="6">No user accounts found.</td></tr>';
        const message = document.getElementById("usersMessage");
        if (message) message.textContent = `Loaded ${data.length} account(s).`;
    } catch (error) {
        table.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
}

async function saveUserRole(id) {
    const select = document.getElementById(`role-${id}`);
    if (!select) return;
    if (!confirm(`Change this user's role to ${select.value}? They must log in again for the change to apply.`)) return;
    try {
        const response = await apiFetch(`${API}/user/${id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: select.value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to update role.");
        alert(data.message || "Role updated.");
        await loadUsers();
    } catch (error) {
        alert(error.message);
    }
}

async function toggleUserStatus(id, isActive) {
    const action = isActive ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;
    try {
        const response = await apiFetch(`${API}/user/${id}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Unable to ${action} account.`);
        alert(data.message || "Account status updated.");
        await loadUsers();
    } catch (error) {
        alert(error.message);
    }
}
