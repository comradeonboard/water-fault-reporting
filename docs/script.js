const form = document.getElementById('faultForm');
const reportList = document.getElementById('reportList');
const formMessage = document.getElementById('formMessage');

const STORAGE_KEY = 'waterFaultReports';

function loadReports() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function formatReference(index) {
  return `WF-${String(index + 1).padStart(4, '0')}`;
}

function createStatusChip(status) {
  const span = document.createElement('span');
  span.className = `status-chip status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  span.textContent = status;
  return span;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function createImagePreview(photo) {
  if (!photo) return null;
  const img = document.createElement('img');
  img.src = photo;
  img.alt = 'Reported issue photo';
  img.className = 'report-image';
  return img;
}

function renderReports() {
  const reports = loadReports();
  reportList.innerHTML = '';

  if (!reports.length) {
    reportList.innerHTML = '<div class="empty-state">No reports yet. Submit the form above.</div>';
    return;
  }

  reports.forEach((report, index) => {
    const item = document.createElement('article');
    item.className = 'history-item';

    item.innerHTML = `
      <div class="history-item-header">
        <div>
          <p class="eyebrow">Ref ${formatReference(index)}</p>
          <h3>${report.issueType} — ${report.location}</h3>
          <div class="history-meta">
            <span>${report.reporterEmail}</span>
            <span>Reported: ${formatDate(report.createdAt)}</span>
            <span>Last update: ${formatDate(report.updatedAt)}</span>
          </div>
        </div>
        <div class="status-row">
          ${createStatusChip(report.status).outerHTML}
          <select data-index="${index}" class="status-select"></select>
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

    const select = item.querySelector('.status-select');
    ['Open', 'In Progress', 'Resolved'].forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = report.status === value;
      select.appendChild(option);
    });
    select.addEventListener('change', () => updateStatus(index, select.value));

    const imageElement = createImagePreview(report.photo);
    if (imageElement) {
      item.appendChild(imageElement);
    }

    reportList.appendChild(item);
  });
}

function updateStatus(index, status) {
  const reports = loadReports();
  reports[index].status = status;
  reports[index].updatedAt = new Date().toISOString();
  saveReports(reports);
  renderReports();
}

function resetForm() {
  form.reset();
  setTimeout(() => {
    formMessage.textContent = '';
  }, 2500);
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const reporterEmail = form.reporterEmail.value.trim();
  const location = form.location.value.trim();
  const issueType = form.issueType.value;
  const severity = form.severity.value;
  const description = form.description.value.trim();
  const imageFile = form.imageUpload.files[0];

  if (!reporterEmail || !location || !issueType || !severity || !description) {
    formMessage.textContent = 'Please fill out every field.';
    return;
  }

  let photo = null;
  if (imageFile) {
    photo = await readImageFile(imageFile);
  }

  const data = {
    reporterEmail,
    location,
    issueType,
    severity,
    description,
    photo,
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reports = loadReports();
  reports.unshift(data);
  saveReports(reports);
  renderReports();

  formMessage.textContent = 'Report submitted successfully.';
  resetForm();
});

renderReports();
