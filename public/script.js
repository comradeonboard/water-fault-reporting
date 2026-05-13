const form = document.getElementById("faultForm");
const reportList = document.getElementById("reportList");
const formMessage = document.getElementById("formMessage");
const userGreeting = document.getElementById("userGreeting");
const logoutButton = document.getElementById("logoutButton");

function formatReference(index) {
  return `WF-${String(index + 1).padStart(4, "0")}`;
}

function createStatusChip(status) {
  const span = document.createElement("span");
  span.className = `status-chip status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  span.textContent = status;
  return span;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
  if (!isError) {
    setTimeout(() => {
      formMessage.textContent = "";
    }, 2500);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || "Request failed.";
    throw new Error(message);
  }
  return payload;
}

async function requireAuth() {
  const response = await fetch("/api/me", { credentials: "include" });
  if (!response.ok) {
    window.location.href = "/Auth.html";
    throw new Error("Unauthorized");
  }
  return response.json();
}

async function loadReports() {
  const reports = await fetchJson("/api/reports", { credentials: "include" });
  renderReports(reports);
}

function renderReports(reports) {
  reportList.innerHTML = "";

  if (!reports.length) {
    reportList.innerHTML =
      '<div class="empty-state">No reports yet. Submit the form above.</div>';
    return;
  }

  reports.forEach((report, index) => {
    const item = document.createElement("article");
    item.className = "history-item";

    item.innerHTML = `
      <div class="history-item-header">
        <div>
          <p class="eyebrow">Ref ${formatReference(index)}</p>
          <h3>${report.issueType} — ${report.location}</h3>
          <div class="history-meta">
            <span>Reported: ${formatDate(report.createdAt)}</span>
            <span>Last update: ${formatDate(report.updatedAt)}</span>
          </div>
        </div>
        <div class="status-row">
          ${createStatusChip(report.status).outerHTML}
          <select data-report-id="${report.id}" class="status-select"></select>
        </div>
      </div>
      <div class="history-detail">
        <p class="report-description">${report.description}</p>
        <div class="report-tags">
          <span class="tag">Severity: ${report.severity}</span>
          <span class="tag">Type: ${report.issueType}</span>
        </div>
      </div>
    `;

    const select = item.querySelector(".status-select");
    ["Open", "In Progress", "Resolved"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = report.status === value;
      select.appendChild(option);
    });
    select.addEventListener("change", async () => {
      try {
        await updateStatus(report.id, select.value);
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    reportList.appendChild(item);
  });
}

async function updateStatus(reportId, status) {
  await fetchJson(`/api/reports/${reportId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  await loadReports();
}

function resetForm() {
  form.reset();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const location = form.location.value.trim();
  const issueType = form.issueType.value;
  const severity = form.severity.value;
  const description = form.description.value.trim();

  if (!location || !issueType || !severity || !description) {
    showMessage("Please fill out every field.", true);
    return;
  }

  try {
    await fetchJson("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ location, issueType, severity, description }),
    });
    showMessage("Report submitted successfully.");
    resetForm();
    await loadReports();
  } catch (error) {
    showMessage(error.message, true);
  }
});

logoutButton?.addEventListener("click", async () => {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/Auth.html";
});

async function init() {
  try {
    const user = await requireAuth();
    userGreeting.textContent = `Signed in as ${user.name} (${user.email})`;
    await loadReports();
  } catch {
    // Redirect handled in requireAuth.
  }
}

init();
