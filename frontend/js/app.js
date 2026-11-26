// ============================================================
// frontend/js/app.js
// Vanilla JS SPA-lite: tab switching, table rendering, and a
// single reusable modal that renders a different form per
// resource. No frameworks, no page reloads.
// ============================================================

// ---- state ----
let doctors = [];   // cached, used to populate appointment-form <select>s
let patients = [];

// ---- small DOM helpers ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showFeedback(panelId, message, type = 'error') {
  const el = $(`#${panelId}-feedback`);
  el.textContent = message;
  el.className = `feedback ${type}`;
  if (type === 'success') setTimeout(() => { el.textContent = ''; }, 3000);
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ============================================================
// Tabs
// ============================================================
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
  $$('.panel').forEach((p) => p.classList.toggle('active', p.id === btn.dataset.tab));
});

// ============================================================
// APPOINTMENTS
// ============================================================
function statusBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

function formatDateTime(value) {
  // value comes back as 'YYYY-MM-DD HH:MM:SS' (dateStrings: true in the pool)
  const [datePart, timePart] = value.split(' ');
  return `${datePart} ${timePart ? timePart.slice(0, 5) : ''}`;
}

async function loadAppointments() {
  const q = $('#appt-search').value.trim();
  const status = $('#appt-status-filter').value;
  const tbody = $('#appt-tbody');
  try {
    const rows = await appointmentsApi.list({ q, status });
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No appointments found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((a) => `
      <tr>
        <td>${escapeHtml(formatDateTime(a.appointment_date))}</td>
        <td>${escapeHtml(a.patient_name)}</td>
        <td>${escapeHtml(a.doctor_name)} <span style="color:var(--gray-400)">(${escapeHtml(a.doctor_specialty)})</span></td>
        <td>${statusBadge(a.status)}</td>
        <td>${escapeHtml(a.notes || '—')}</td>
        <td class="row-actions">
          <button data-action="edit" data-id="${a.id}">Edit</button>
          <button data-action="delete" data-id="${a.id}" class="delete">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showFeedback('appt', err.message);
  }
}

$('#appt-search').addEventListener('input', debounce(loadAppointments));
$('#appt-status-filter').addEventListener('change', loadAppointments);

$('#appt-tbody').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') openAppointmentForm(id);
  if (btn.dataset.action === 'delete') confirmDelete('appointment', id);
});

$('#btn-new-appointment').addEventListener('click', () => openAppointmentForm());

async function openAppointmentForm(id) {
  // Ensure patient/doctor pick-lists are fresh for the dropdowns.
  [doctors, patients] = await Promise.all([doctorsApi.list(), patientsApi.list()]);

  let record = null;
  if (id) {
    try { record = await appointmentsApi.get(id); }
    catch (err) { showFeedback('appt', err.message); return; }
  }

  const doctorOptions = doctors.map((d) =>
    `<option value="${d.id}" ${record?.doctor_id === d.id ? 'selected' : ''}>${escapeHtml(d.full_name)} — ${escapeHtml(d.specialty)}</option>`
  ).join('');
  const patientOptions = patients.map((p) =>
    `<option value="${p.id}" ${record?.patient_id === p.id ? 'selected' : ''}>${escapeHtml(p.full_name)}</option>`
  ).join('');

  const dtValue = record ? record.appointment_date.replace(' ', 'T').slice(0, 16) : '';

  openModal({
    title: record ? 'Edit Appointment' : 'New Appointment',
    bodyHtml: `
      <div class="field">
        <label for="f-patient">Patient</label>
        <select id="f-patient" required>${patientOptions}</select>
      </div>
      <div class="field">
        <label for="f-doctor">Doctor</label>
        <select id="f-doctor" required>${doctorOptions}</select>
      </div>
      <div class="field">
        <label for="f-datetime">Date &amp; time</label>
        <input type="datetime-local" id="f-datetime" value="${dtValue}" required>
      </div>
      <div class="field">
        <label for="f-status">Status</label>
        <select id="f-status">
          <option value="scheduled" ${record?.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
          <option value="completed" ${record?.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${record?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div class="field">
        <label for="f-notes">Notes</label>
        <textarea id="f-notes" rows="2">${escapeHtml(record?.notes || '')}</textarea>
      </div>
      <div id="form-error" class="field-error"></div>
    `,
    onSubmit: async () => {
      const payload = {
        patient_id: Number($('#f-patient').value),
        doctor_id: Number($('#f-doctor').value),
        appointment_date: $('#f-datetime').value.replace('T', ' ') + ':00',
        status: $('#f-status').value,
        notes: $('#f-notes').value.trim() || null,
      };
      if (id) await appointmentsApi.update(id, payload);
      else await appointmentsApi.create(payload);
      closeModal();
      loadAppointments();
      showFeedback('appt', id ? 'Appointment updated.' : 'Appointment created.', 'success');
    },
  });
}

// ============================================================
// PATIENTS
// ============================================================
async function loadPatients() {
  const q = $('#patient-search').value.trim();
  const tbody = $('#patient-tbody');
  try {
    const rows = await patientsApi.list({ q });
    patients = rows;
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No patients found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((p) => `
      <tr>
        <td>${escapeHtml(p.full_name)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${escapeHtml(p.date_of_birth || '—')}</td>
        <td class="row-actions">
          <button data-action="edit" data-id="${p.id}">Edit</button>
          <button data-action="delete" data-id="${p.id}" class="delete">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showFeedback('patient', err.message);
  }
}

$('#patient-search').addEventListener('input', debounce(loadPatients));

$('#patient-tbody').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') openPatientForm(id);
  if (btn.dataset.action === 'delete') confirmDelete('patient', id);
});

$('#btn-new-patient').addEventListener('click', () => openPatientForm());

async function openPatientForm(id) {
  let record = null;
  if (id) {
    try { record = await patientsApi.get(id); }
    catch (err) { showFeedback('patient', err.message); return; }
  }

  openModal({
    title: record ? 'Edit Patient' : 'New Patient',
    bodyHtml: `
      <div class="field">
        <label for="f-name">Full name</label>
        <input type="text" id="f-name" value="${escapeHtml(record?.full_name || '')}" required>
      </div>
      <div class="field">
        <label for="f-email">Email</label>
        <input type="email" id="f-email" value="${escapeHtml(record?.email || '')}" required>
      </div>
      <div class="field">
        <label for="f-phone">Phone</label>
        <input type="text" id="f-phone" value="${escapeHtml(record?.phone || '')}">
      </div>
      <div class="field">
        <label for="f-dob">Date of birth</label>
        <input type="date" id="f-dob" value="${record?.date_of_birth || ''}">
      </div>
      <div id="form-error" class="field-error"></div>
    `,
    onSubmit: async () => {
      const payload = {
        full_name: $('#f-name').value.trim(),
        email: $('#f-email').value.trim(),
        phone: $('#f-phone').value.trim() || null,
        date_of_birth: $('#f-dob').value || null,
      };
      if (id) await patientsApi.update(id, payload);
      else await patientsApi.create(payload);
      closeModal();
      loadPatients();
      showFeedback('patient', id ? 'Patient updated.' : 'Patient created.', 'success');
    },
  });
}

// ============================================================
// DOCTORS
// ============================================================
async function loadDoctors() {
  const q = $('#doctor-search').value.trim();
  const tbody = $('#doctor-tbody');
  try {
    const rows = await doctorsApi.list({ q });
    doctors = rows;
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No doctors found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((d) => `
      <tr>
        <td>${escapeHtml(d.full_name)}</td>
        <td>${escapeHtml(d.specialty)}</td>
        <td>${escapeHtml(d.email)}</td>
        <td>${escapeHtml(d.phone || '—')}</td>
        <td class="row-actions">
          <button data-action="edit" data-id="${d.id}">Edit</button>
          <button data-action="delete" data-id="${d.id}" class="delete">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showFeedback('doctor', err.message);
  }
}

$('#doctor-search').addEventListener('input', debounce(loadDoctors));

$('#doctor-tbody').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === 'edit') openDoctorForm(id);
  if (btn.dataset.action === 'delete') confirmDelete('doctor', id);
});

$('#btn-new-doctor').addEventListener('click', () => openDoctorForm());

async function openDoctorForm(id) {
  let record = null;
  if (id) {
    try { record = await doctorsApi.get(id); }
    catch (err) { showFeedback('doctor', err.message); return; }
  }

  openModal({
    title: record ? 'Edit Doctor' : 'New Doctor',
    bodyHtml: `
      <div class="field">
        <label for="f-name">Full name</label>
        <input type="text" id="f-name" value="${escapeHtml(record?.full_name || '')}" required>
      </div>
      <div class="field">
        <label for="f-specialty">Specialty</label>
        <input type="text" id="f-specialty" value="${escapeHtml(record?.specialty || '')}" required>
      </div>
      <div class="field">
        <label for="f-email">Email</label>
        <input type="email" id="f-email" value="${escapeHtml(record?.email || '')}" required>
      </div>
      <div class="field">
        <label for="f-phone">Phone</label>
        <input type="text" id="f-phone" value="${escapeHtml(record?.phone || '')}">
      </div>
      <div id="form-error" class="field-error"></div>
    `,
    onSubmit: async () => {
      const payload = {
        full_name: $('#f-name').value.trim(),
        specialty: $('#f-specialty').value.trim(),
        email: $('#f-email').value.trim(),
        phone: $('#f-phone').value.trim() || null,
      };
      if (id) await doctorsApi.update(id, payload);
      else await doctorsApi.create(payload);
      closeModal();
      loadDoctors();
      showFeedback('doctor', id ? 'Doctor updated.' : 'Doctor created.', 'success');
    },
  });
}

// ============================================================
// Shared modal (create/edit form host)
// ============================================================
let currentOnSubmit = null;

function openModal({ title, bodyHtml, onSubmit }) {
  $('#modal-title').textContent = title;
  $('#modal-form').innerHTML = bodyHtml + `
    <div class="modal-actions">
      <button type="button" class="btn" id="modal-cancel">Cancel</button>
      <button type="submit" class="btn primary">Save</button>
    </div>
  `;
  currentOnSubmit = onSubmit;
  $('#modal-overlay').classList.add('open');
}

function closeModal() {
  $('#modal-overlay').classList.remove('open');
  $('#modal-form').innerHTML = '';
  currentOnSubmit = null;
}

$('#modal-close').addEventListener('click', closeModal);
$('#modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});
$('#modal-form').addEventListener('click', (e) => {
  if (e.target.id === 'modal-cancel') closeModal();
});

$('#modal-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // no page reload
  const errorEl = $('#form-error');
  errorEl.textContent = '';
  try {
    await currentOnSubmit();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ============================================================
// Shared delete-confirmation dialog
// ============================================================
let pendingDelete = null; // { type, id }

const DELETE_HANDLERS = {
  appointment: { api: appointmentsApi, reload: loadAppointments, panel: 'appt' },
  patient: { api: patientsApi, reload: loadPatients, panel: 'patient' },
  doctor: { api: doctorsApi, reload: loadDoctors, panel: 'doctor' },
};

function confirmDelete(type, id) {
  pendingDelete = { type, id };
  $('#confirm-text').textContent = `Are you sure you want to delete this ${type}? This cannot be undone.`;
  $('#confirm-overlay').classList.add('open');
}

function closeConfirm() {
  $('#confirm-overlay').classList.remove('open');
  pendingDelete = null;
}

$('#confirm-cancel').addEventListener('click', closeConfirm);
$('#confirm-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-overlay') closeConfirm();
});

$('#confirm-delete').addEventListener('click', async () => {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;
  const handler = DELETE_HANDLERS[type];
  try {
    await handler.api.remove(id);
    closeConfirm();
    handler.reload();
    showFeedback(handler.panel, `${type[0].toUpperCase()}${type.slice(1)} deleted.`, 'success');
  } catch (err) {
    closeConfirm();
    showFeedback(handler.panel, err.message);
  }
});

// ============================================================
// Init
// ============================================================
loadAppointments();
loadPatients();
loadDoctors();
