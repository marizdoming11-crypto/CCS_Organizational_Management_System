/* Membership Fee Management UI
   Uses the existing API, JWT helper, navigation, and toast functions from app.js.
*/
(() => {
  const feeState = {
    fees: [],
    members: [],
    activeFeeId: 0,
    tab: "overview"
  };

  const peso = value => new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP"
  }).format(Number(value || 0));

  const esc = value => escapeHtml(value);

  function feeTabs() {
    return `
      <div class="fee-tabs" role="tablist" aria-label="Membership fee sections">
        ${[
          ["overview", "Overview"],
          ["record", "Record Payment"],
          ["verification", "GCash Verification"],
          ["balances", "Student Balances"],
          ["history", "Payment History"]
        ].map(([id, label]) => `
          <button type="button" class="fee-tab ${feeState.tab === id ? "active" : ""}"
            data-fee-tab="${id}" role="tab" aria-selected="${feeState.tab === id}">
            ${label}
          </button>`).join("")}
      </div>
    `;
  }

  async function renderMembershipFees() {
    const host = document.getElementById("pageContent");
    if (!host) return;

    host.innerHTML = `
      <div class="hero">
        <p class="eyebrow">FINANCE WORKSPACE</p>
        <h2>Membership Fee Management</h2>
        <p>Manage the ₱150 semester membership fee, installment payments, GCash verification, receipts, and collection reports.</p>
      </div>
      <div class="fee-toolbar">
        <div class="field">
          <label for="feeSemesterSelect">Academic year / semester</label>
          <select id="feeSemesterSelect"><option value="">Loading fee configurations...</option></select>
        </div>
        <button type="button" class="secondary-btn" id="feeRefreshBtn">Refresh</button>
      </div>
      ${feeTabs()}
      <section id="feeWorkspace" aria-live="polite"><div class="panel">Loading membership fee information...</div></section>
    `;

    document.querySelectorAll("[data-fee-tab]").forEach(button => {
      button.addEventListener("click", () => {
        feeState.tab = button.dataset.feeTab;
        renderFeeTab();
      });
    });

    document.getElementById("feeRefreshBtn")?.addEventListener("click", loadFeePage);
    document.getElementById("feeSemesterSelect")?.addEventListener("change", event => {
      feeState.activeFeeId = Number(event.target.value || 0);
      renderFeeTab();
    });

    await loadFeePage();
  }

  async function loadFeePage() {
    const select = document.getElementById("feeSemesterSelect");
    const workspace = document.getElementById("feeWorkspace");
    if (!select || !workspace) return;

    workspace.innerHTML = '<div class="panel">Loading membership fee information...</div>';

    try {
      const [fees, members] = await Promise.all([
        apiFetch("/membership-fees"),
        apiFetch("/workspace/members")
      ]);

      feeState.fees = Array.isArray(fees) ? fees : [];
      feeState.members = Array.isArray(members) ? members : [];

      if (!feeState.activeFeeId && feeState.fees.length) {
        feeState.activeFeeId = Number(feeState.fees[0].fee_id);
      }

      select.innerHTML = feeState.fees.length
        ? feeState.fees.map(fee => {
            const id = Number(fee.fee_id);
            const label = `${fee.academic_year} • ${fee.semester} • ${peso(fee.required_amount)} • ${fee.status}`;
            return `<option value="${id}" ${id === feeState.activeFeeId ? "selected" : ""}>${esc(label)}</option>`;
          }).join("")
        : '<option value="">No membership fee configuration found</option>';

      await renderFeeTab();
    } catch (error) {
      workspace.innerHTML = `<div class="panel error-text">Unable to load membership fees: ${esc(error.message)}</div>`;
    }
  }

  async function renderFeeTab() {
    const workspace = document.getElementById("feeWorkspace");
    if (!workspace) return;

    document.querySelectorAll("[data-fee-tab]").forEach(button => {
      const active = button.dataset.feeTab === feeState.tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    if (!feeState.activeFeeId) {
      workspace.innerHTML = '<div class="panel empty">Create or activate a membership fee configuration before recording payments.</div>';
      return;
    }

    workspace.innerHTML = '<div class="panel">Loading...</div>';

    try {
      if (feeState.tab === "overview") await renderFeeOverview(workspace);
      else if (feeState.tab === "record") renderFeePaymentForm(workspace);
      else if (feeState.tab === "verification") await renderFeeVerification(workspace);
      else if (feeState.tab === "balances") await renderFeeBalances(workspace);
      else if (feeState.tab === "history") await renderFeeHistory(workspace);
    } catch (error) {
      workspace.innerHTML = `<div class="panel error-text">Unable to load this section: ${esc(error.message)}</div>`;
    }
  }

  async function renderFeeOverview(workspace) {
    const summary = await apiFetch(`/membership-fees/${feeState.activeFeeId}/collection-summary`);
    const students = summary.students || {};
    const collection = summary.collection || {};
    const pending = summary.pending_gcash || {};

    workspace.innerHTML = `
      <div class="fee-kpi-grid">
        <article class="fee-kpi"><span>Total students</span><strong>${students.total_members ?? 0}</strong></article>
        <article class="fee-kpi"><span>Fully paid</span><strong>${students.fully_paid ?? 0}</strong></article>
        <article class="fee-kpi"><span>Partially paid</span><strong>${students.partially_paid ?? 0}</strong></article>
        <article class="fee-kpi"><span>Unpaid</span><strong>${students.unpaid ?? 0}</strong></article>
      </div>
      <div class="fee-report-grid">
        <article class="panel">
          <h3>Collection Summary</h3>
          <div class="fee-summary-line"><span>Expected collection</span><strong>${peso(collection.expected_collection)}</strong></div>
          <div class="fee-summary-line"><span>Total collected</span><strong>${peso(collection.total_collected)}</strong></div>
          <div class="fee-summary-line"><span>Remaining collection</span><strong>${peso(collection.remaining_collection)}</strong></div>
          <div class="fee-progress"><span style="width:${Math.min(100, Number(collection.collection_percentage || 0))}%"></span></div>
          <p class="muted">${Number(collection.collection_percentage || 0).toFixed(2)}% collected</p>
        </article>
        <article class="panel">
          <h3>Pending GCash</h3>
          <div class="fee-big-number">${pending.pending_transactions ?? 0}</div>
          <p>Transaction(s) awaiting verification</p>
          <strong>${peso(pending.pending_amount)}</strong>
          <div class="form-actions"><button class="primary-btn" id="goFeeVerification">Review payments</button></div>
        </article>
      </div>
      <div class="panel">
        <h3>Selected Membership Fee</h3>
        <p><strong>${esc(summary.academic_year)} — ${esc(summary.semester)}</strong></p>
        <p>Required contribution per student: <strong>${peso(summary.required_amount_per_member)}</strong></p>
        <p>Fee status: <strong>${esc(summary.fee_status)}</strong></p>
      </div>
    `;

    document.getElementById("goFeeVerification")?.addEventListener("click", () => {
      feeState.tab = "verification";
      renderFeeTab();
    });
  }

  function renderFeePaymentForm(workspace) {
    const memberOptions = feeState.members.map(member => {
      const id = Number(member.id ?? member.member_id ?? 0);
      const name = [member.first_name, member.middle_name, member.last_name]
        .map(part => String(part || "").trim()).filter(Boolean).join(" ")
        || member.full_name || member.name || `Member #${id}`;
      return `<option value="${id}">${esc(name)}${member.year_section ? ` — ${esc(member.year_section)}` : ""}</option>`;
    }).join("");

    workspace.innerHTML = `
      <div class="panel">
        <h3>Record Membership Payment</h3>
        <p class="muted">Installments are allowed. The membership fee is ₱150 per semester. Only verified payments count toward the balance.</p>
        <form id="membershipPaymentForm">
          <div class="form-grid">
            <div class="field"><label for="feeMemberId">Student</label><select id="feeMemberId" required><option value="">Select student</option>${memberOptions}</select></div>
            <div class="field"><label for="feeAmount">Amount paid (₱)</label><input id="feeAmount" type="number" min="0.01" step="0.01" required></div>
            <div class="field"><label for="feePaymentMethod">Payment method</label><select id="feePaymentMethod" required><option value="Cash">Cash</option><option value="GCash">GCash</option></select></div>
            <div class="field"><label for="feePaymentDate">Payment date</label><input id="feePaymentDate" type="date" value="${new Date().toLocaleDateString("en-CA")}" required></div>
            <div class="field" id="feeReferenceField" hidden><label for="feeReference">GCash reference number</label><input id="feeReference" type="text" maxlength="100"></div>
            <div class="field" id="feeProofField" hidden><label for="feeProofFile">GCash screenshot (JPG, PNG, WEBP; max 5 MB)</label><input id="feeProofFile" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"></div>
            <div class="field"><label for="feeRemarks">Remarks (optional)</label><input id="feeRemarks" type="text" maxlength="500"></div>
          </div>
          <div class="panel fee-note" id="feeBalancePreview">Select a student to view their current balance.</div>
          <div class="form-actions"><button class="primary-btn" type="submit" id="saveFeePaymentBtn">Record Payment</button></div>
          <p class="muted">Cash is recorded as Verified. GCash is recorded as Pending and must be verified by the adviser.</p>
        </form>
      </div>
    `;

    const method = document.getElementById("feePaymentMethod");
    const refField = document.getElementById("feeReferenceField");
    const proofField = document.getElementById("feeProofField");
    const member = document.getElementById("feeMemberId");

    method.addEventListener("change", () => {
      const isGCash = method.value === "GCash";
      refField.hidden = !isGCash;
      proofField.hidden = !isGCash;
      document.getElementById("feeReference").required = isGCash;
    });

    member.addEventListener("change", loadFeeBalancePreview);
    document.getElementById("membershipPaymentForm").addEventListener("submit", submitMembershipPayment);
  }

  async function loadFeeBalancePreview() {
    const memberId = Number(document.getElementById("feeMemberId")?.value || 0);
    const preview = document.getElementById("feeBalancePreview");
    if (!preview) return;
    if (!memberId) {
      preview.textContent = "Select a student to view their current balance.";
      return;
    }

    try {
      const balance = await apiFetch(`/membership-fees/${feeState.activeFeeId}/members/${memberId}/balance`);
      preview.innerHTML = `
        <strong>${esc(balance.full_name)}</strong>
        <div class="fee-summary-line"><span>Required</span><strong>${peso(balance.required_amount)}</strong></div>
        <div class="fee-summary-line"><span>Verified paid</span><strong>${peso(balance.total_paid)}</strong></div>
        <div class="fee-summary-line"><span>Remaining balance</span><strong>${peso(balance.balance)}</strong></div>
        <span class="fee-status ${String(balance.payment_status).toLowerCase().replaceAll(" ", "-")}">${esc(balance.payment_status)}</span>`;
    } catch (error) {
      preview.textContent = error.message;
    }
  }

  async function submitMembershipPayment(event) {
    event.preventDefault();

    const button = document.getElementById("saveFeePaymentBtn");
    const method = document.getElementById("feePaymentMethod").value;
    const payload = {
      feeId: feeState.activeFeeId,
      memberId: Number(document.getElementById("feeMemberId").value),
      amountPaid: Number(document.getElementById("feeAmount").value),
      paymentMethod: method,
      referenceNumber: document.getElementById("feeReference").value.trim() || null,
      paymentDate: document.getElementById("feePaymentDate").value,
      remarks: document.getElementById("feeRemarks").value.trim() || null
    };

    if (method === "GCash" && !payload.referenceNumber) {
      showToast("GCash reference number is required.");
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";
    try {
      const result = await apiFetch("/membership-fees/payments", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const paymentId = result.payment_id;
      showToast(result.message || "Payment recorded.");

      if (method === "GCash") {
        const upload = await uploadProofForPayment(paymentId);
        if (!upload) {
          showToast("Payment is pending. Upload its proof from the GCash Verification section before verification.");
        }
      } else if (result.receipt_number) {
        showToast(`Cash payment verified. Receipt: ${result.receipt_number}`);
      }

      feeState.tab = method === "GCash" ? "verification" : "history";
      await renderFeeTab();
    } catch (error) {
      showToast(`Unable to record payment: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "Record Payment";
    }
  }

  async function uploadProofForPayment(paymentId) {
    const fileInput = document.getElementById("feeProofFile");
    const file = fileInput?.files?.[0];
    if (!file) return false;

    const form = new FormData();
    form.append("file", file);

    await apiFetch(`/membership-fees/payments/${paymentId}/attachments`, {
      method: "POST",
      body: form
    });
    return true;
  }

  async function renderFeeVerification(workspace) {
    const rows = await apiFetch("/membership-fees/payments/pending-verification");
    const payments = Array.isArray(rows) ? rows : [];

    workspace.innerHTML = `
      <div class="panel">
        <div class="toolbar"><div><h3>Pending GCash Verification</h3><p class="muted">Review the reference number and uploaded screenshot before verifying or rejecting a payment.</p></div><button class="secondary-btn" id="refreshPendingFees">Refresh</button></div>
        ${payments.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Student</th><th>Amount</th><th>Reference</th><th>Payment date</th><th>Proof</th><th>Actions</th></tr></thead>
          <tbody>${payments.map(payment => {
            const proof = (payment.attachments || [])[0];
            return `<tr>
              <td>${esc(payment.student_name)}<small class="muted">ID: ${payment.member_id}</small></td>
              <td>${peso(payment.amount_paid)}</td>
              <td>${esc(payment.reference_number || "—")}</td>
              <td>${esc(payment.payment_date)}</td>
              <td>${proof ? `<a href="${API}${proof.view_url}" target="_blank" rel="noopener">View ${esc(proof.file_name)}</a>` : '<span class="fee-status unpaid">No proof uploaded</span>'}</td>
              <td class="table-actions">
                <button class="primary-btn" data-verify-payment="${payment.payment_id}" ${proof ? "" : "disabled"}>Verify</button>
                <button class="danger-btn" data-reject-payment="${payment.payment_id}">Reject</button>
              </td>
            </tr>`;
          }).join("")}</tbody></table></div>` : '<p class="empty">No pending GCash payments.</p>'}
      </div>
    `;

    document.getElementById("refreshPendingFees")?.addEventListener("click", renderFeeTab);
    workspace.querySelectorAll("[data-verify-payment]").forEach(button => {
      button.addEventListener("click", () => verifyFeePayment(Number(button.dataset.verifyPayment)));
    });
    workspace.querySelectorAll("[data-reject-payment]").forEach(button => {
      button.addEventListener("click", () => rejectFeePayment(Number(button.dataset.rejectPayment)));
    });
  }

  async function verifyFeePayment(paymentId) {
    if (!confirm("Verify this GCash payment? A receipt will be generated after successful verification.")) return;
    try {
      const result = await apiFetch(`/membership-fees/payments/${paymentId}/verify`, { method: "PATCH" });
      showToast(result.message || `Payment verified. Receipt: ${result.receipt_number || "generated"}`);
      await renderFeeTab();
    } catch (error) {
      showToast(`Unable to verify payment: ${error.message}`);
    }
  }

  async function rejectFeePayment(paymentId) {
    const reason = prompt("Enter the reason for rejecting this GCash payment:");
    if (!reason || !reason.trim()) return;
    try {
      const result = await apiFetch(`/membership-fees/payments/${paymentId}/reject?reason=${encodeURIComponent(reason.trim())}`, { method: "PATCH" });
      showToast(result.message || "Payment rejected.");
      await renderFeeTab();
    } catch (error) {
      showToast(`Unable to reject payment: ${error.message}`);
    }
  }

  async function renderFeeBalances(workspace) {
    const status = document.getElementById("feeBalanceFilter")?.value || "";
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const result = await apiFetch(`/membership-fees/${feeState.activeFeeId}/student-status${query}`);
    const students = result.students || [];

    workspace.innerHTML = `
      <div class="panel">
        <div class="toolbar"><div><h3>Student Payment Balances</h3><p class="muted">Only Verified payments are included.</p></div>
          <select id="feeBalanceFilter" aria-label="Filter payment status">
            <option value="">All statuses</option><option value="Fully Paid">Fully Paid</option><option value="Partially Paid">Partially Paid</option><option value="Unpaid">Unpaid</option>
          </select>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Student</th><th>Required</th><th>Verified paid</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>${students.length ? students.map(student => `<tr>
            <td>${esc(student.student_name)}<small class="muted">ID: ${student.member_id}</small></td>
            <td>${peso(student.required_amount)}</td><td>${peso(student.total_paid)}</td><td>${peso(student.balance)}</td>
            <td><span class="fee-status ${String(student.payment_status).toLowerCase().replaceAll(" ", "-")}">${esc(student.payment_status)}</span></td>
          </tr>`).join("") : '<tr><td colspan="5" class="empty">No students found for this filter.</td></tr>'}</tbody></table></div>
      </div>
    `;

    document.getElementById("feeBalanceFilter").value = status;
    document.getElementById("feeBalanceFilter").addEventListener("change", event => {
      const selected = event.target.value;
      loadFeeBalancesWithStatus(selected);
    });
  }

  async function loadFeeBalancesWithStatus(status) {
    const workspace = document.getElementById("feeWorkspace");
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    try {
      const result = await apiFetch(`/membership-fees/${feeState.activeFeeId}/student-status${query}`);
      const students = result.students || [];
      const body = document.querySelector("#feeWorkspace tbody");
      if (!body) return;
      body.innerHTML = students.length ? students.map(student => `<tr>
        <td>${esc(student.student_name)}<small class="muted">ID: ${student.member_id}</small></td>
        <td>${peso(student.required_amount)}</td><td>${peso(student.total_paid)}</td><td>${peso(student.balance)}</td>
        <td><span class="fee-status ${String(student.payment_status).toLowerCase().replaceAll(" ", "-")}">${esc(student.payment_status)}</span></td>
      </tr>`).join("") : '<tr><td colspan="5" class="empty">No students found for this filter.</td></tr>';
    } catch (error) {
      showToast(error.message);
    }
  }

  async function renderFeeHistory(workspace) {
    const rows = await apiFetch(`/membership-fees/payments/history?feeId=${feeState.activeFeeId}`);
    const payments = Array.isArray(rows) ? rows : [];

    workspace.innerHTML = `
      <div class="panel">
        <div class="toolbar"><div><h3>Payment History</h3><p class="muted">Cash and GCash transactions for the selected semester.</p></div>
          <select id="feeHistoryStatus"><option value="">All statuses</option><option>Pending</option><option>Verified</option><option>Rejected</option></select>
          <button class="secondary-btn" id="refreshFeeHistory">Refresh</button>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Student</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
          <tbody>${payments.length ? payments.map(payment => `<tr>
            <td>${esc(payment.student_name)}</td><td>${esc(payment.payment_date)}</td><td>${esc(payment.payment_method)}</td>
            <td>${esc(payment.reference_number || "—")}</td><td>${peso(payment.amount_paid)}</td>
            <td><span class="fee-status ${String(payment.verification_status).toLowerCase()}">${esc(payment.verification_status)}</span></td>
            <td>${payment.receipt?.receipt_number ? `<button type="button" class="secondary-btn" data-receipt="${payment.payment_id}">View receipt</button>` : "—"}</td>
          </tr>`).join("") : '<tr><td colspan="7" class="empty">No payment records found.</td></tr>'}</tbody></table></div>
      </div>
    `;

    document.getElementById("feeHistoryStatus").addEventListener("change", event => loadFeeHistoryStatus(event.target.value));
    document.getElementById("refreshFeeHistory").addEventListener("click", renderFeeTab);
    workspace.querySelectorAll("[data-receipt]").forEach(button => {
      button.addEventListener("click", () => printFeeReceipt(Number(button.dataset.receipt)));
    });
  }

  async function loadFeeHistoryStatus(status) {
    const query = `?feeId=${feeState.activeFeeId}` + (status ? `&status=${encodeURIComponent(status)}` : "");
    try {
      const payments = await apiFetch(`/membership-fees/payments/history${query}`);
      const body = document.querySelector("#feeWorkspace tbody");
      if (!body) return;
      body.innerHTML = payments.length ? payments.map(payment => `<tr>
        <td>${esc(payment.student_name)}</td><td>${esc(payment.payment_date)}</td><td>${esc(payment.payment_method)}</td>
        <td>${esc(payment.reference_number || "—")}</td><td>${peso(payment.amount_paid)}</td>
        <td><span class="fee-status ${String(payment.verification_status).toLowerCase()}">${esc(payment.verification_status)}</span></td>
        <td>${payment.receipt?.receipt_number ? `<button type="button" class="secondary-btn" data-receipt="${payment.payment_id}">View receipt</button>` : "—"}</td>
      </tr>`).join("") : '<tr><td colspan="7" class="empty">No payment records found.</td></tr>';
      body.querySelectorAll("[data-receipt]").forEach(button => button.addEventListener("click", () => printFeeReceipt(Number(button.dataset.receipt))));
    } catch (error) {
      showToast(error.message);
    }
  }

  async function printFeeReceipt(paymentId) {
    try {
      const receipt = await apiFetch(`/membership-fees/payments/${paymentId}/receipt`);
      const popup = window.open("", "_blank", "width=700,height=800");
      if (!popup) {
        showToast("Please allow pop-ups to print the receipt.");
        return;
      }

      popup.document.write(`<!doctype html><html><head><title>${esc(receipt.receipt_number)}</title>
        <style>body{font:15px Arial,sans-serif;padding:36px;color:#172033}.receipt{max-width:560px;margin:auto;border:1px solid #ddd;padding:30px}h1{text-align:center}hr{border:0;border-top:1px solid #ddd;margin:22px 0}.line{display:flex;justify-content:space-between;margin:12px 0}.amount{font-size:24px;font-weight:bold;text-align:right;margin-top:28px}@media print{button{display:none}}</style>
        </head><body><div class="receipt"><h1>CSS ORGANIZATION</h1><p style="text-align:center">Membership Fee Official Receipt</p><hr>
        <div class="line"><span>Receipt No.</span><strong>${esc(receipt.receipt_number)}</strong></div>
        <div class="line"><span>Student</span><strong>${esc(receipt.student?.full_name)}</strong></div>
        <div class="line"><span>Academic Year</span><strong>${esc(receipt.membership?.academic_year)}</strong></div>
        <div class="line"><span>Semester</span><strong>${esc(receipt.membership?.semester)}</strong></div>
        <div class="line"><span>Payment Date</span><strong>${esc(receipt.payment?.payment_date)}</strong></div>
        <div class="line"><span>Method</span><strong>${esc(receipt.payment?.payment_method)}</strong></div>
        <div class="line"><span>Reference</span><strong>${esc(receipt.payment?.reference_number || "N/A")}</strong></div>
        <div class="amount">Amount Paid: ${peso(receipt.amount_paid)}</div>
        <hr><p style="text-align:center">Payment Status: ${esc(receipt.payment?.verification_status)}</p>
        <p style="text-align:center">Thank you!</p><button onclick="window.print()">Print Receipt</button></div></body></html>`);
      popup.document.close();
    } catch (error) {
      showToast(`Unable to retrieve receipt: ${error.message}`);
    }
  }

  // Replace only the finance page renderer. All other navigation stays intact.
  const existingNavigate = navigate;
  navigate = function(page) {
    if (page !== "finance") {
      existingNavigate(page);
      return;
    }

    currentPage = "finance";
    editingId = null;

    const button = document.querySelector('#mainNav [data-page="finance"]');
    if (button?.hidden) {
      showToast("You do not have permission to open this module.");
      return;
    }

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.page === "finance");
    });

    const title = document.getElementById("pageTitle");
    if (title) title.textContent = "Membership Fees";

    document.getElementById("sidebar")?.classList.remove("open");
    renderMembershipFees();
  };
})();
