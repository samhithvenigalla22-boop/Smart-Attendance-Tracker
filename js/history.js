/**
 * history.js
 * Attendance Summary & Hours Breakdown Controller (views/history.html)
 * DOM manipulation, event listeners, calls attendanceService & subjectService.
 * Dynamic search, status filter (Safe/Near Target/Shortage), adjust hours modal.
 * NO direct Axios calls.
 */

import { attendanceService } from './service/attendanceService.js';
import { subjectService } from './service/subjectService.js';
import { studentService } from './service/studentService.js';
import { validateAttendanceStats } from '../exception/validationException.js';
import {
  getActiveStudentId,
  setActiveStudentId,
  calculateSubjectAttendance,
  calculateOverallAttendance,
  getAttendanceStatus,
  showToast
} from './utils.js';

let studentSubjects = [];
let allAttendanceRecords = [];
let tableRowsData = [];

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initFilterControls();
  initModalEvents();
  loadHistoryData();

  window.addEventListener('app:student-changed', () => {
    loadHistoryData();
  });
});

function initMobileNav() {
  const toggleBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

async function initStudentSwitcher() {
  const select = document.getElementById('global-student-select');
  if (!select) return;

  try {
    const students = await studentService.getAllStudents();
    const activeId = getActiveStudentId();

    select.innerHTML = '';
    students.forEach((student) => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.name} (${student.rollNumber})`;
      if (Number(student.id) === Number(activeId)) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      setActiveStudentId(e.target.value);
      showToast('Switched active student.', 'info');
    });
  } catch (error) {
    console.error('Failed to init student switcher:', error);
  }
}

async function loadHistoryData() {
  const studentId = getActiveStudentId();

  try {
    const [subjects, attendance] = await Promise.all([
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId)
    ]);

    studentSubjects = subjects || [];
    allAttendanceRecords = attendance || [];

    buildRowsData();
    applyFilters();
  } catch (error) {
    console.error('Failed to load history data:', error);
  }
}

function buildRowsData() {
  tableRowsData = studentSubjects.map((subj) => {
    const record = allAttendanceRecords.find((r) => Number(r.subjectId) === Number(subj.id));
    const conducted = record ? Number(record.conductedHours) || 0 : 0;
    const attended = record ? Number(record.attendedHours) || 0 : 0;
    const absent = Math.max(0, conducted - attended);
    const pct = calculateSubjectAttendance(attended, conducted);
    const target = Number(subj.targetAttendance) || 75;
    const statusInfo = getAttendanceStatus(pct, target);

    return {
      subject: subj,
      recordId: record ? record.id : null,
      conductedHours: conducted,
      attendedHours: attended,
      absentHours: absent,
      pct,
      target,
      statusInfo
    };
  });
}

function initFilterControls() {
  const searchInput = document.getElementById('history-search');
  const statusFilter = document.getElementById('history-status-filter');
  const resetBtn = document.getElementById('btn-reset-filters');

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'ALL';
      applyFilters();
      showToast('Filters reset.', 'info');
    });
  }
}

function applyFilters() {
  const query = (document.getElementById('history-search')?.value || '').trim().toLowerCase();
  const status = document.getElementById('history-status-filter')?.value || 'ALL';

  const filtered = tableRowsData.filter((item) => {
    const nameMatch = item.subject.subjectName.toLowerCase().includes(query);
    const codeMatch = item.subject.subjectCode.toLowerCase().includes(query);
    const matchesSearch = !query || nameMatch || codeMatch;

    let matchesStatus = true;
    if (status === 'SAFE') matchesStatus = item.statusInfo.status === 'Safe';
    else if (status === 'NEAR') matchesStatus = item.statusInfo.status === 'Near Target';
    else if (status === 'SHORTAGE') matchesStatus = item.statusInfo.status === 'Shortage';

    return matchesSearch && matchesStatus;
  });

  updateMetrics(filtered);
  renderTable(filtered);
}

function updateMetrics(rows) {
  let totalConducted = 0;
  let totalAttended = 0;
  let totalAbsent = 0;

  rows.forEach((r) => {
    totalConducted += r.conductedHours;
    totalAttended += r.attendedHours;
    totalAbsent += r.absentHours;
  });

  const overallPct = calculateOverallAttendance(totalAttended, totalConducted);

  const totalEl = document.getElementById('hist-total-count');
  const condEl = document.getElementById('hist-conducted-count');
  const attEl = document.getElementById('hist-attended-count');
  const absEl = document.getElementById('hist-absent-count');
  const rateEl = document.getElementById('hist-rate-pct');

  if (totalEl) totalEl.textContent = rows.length;
  if (condEl) condEl.textContent = `${totalConducted} hrs`;
  if (attEl) attEl.textContent = `${totalAttended} hrs`;
  if (absEl) absEl.textContent = `${totalAbsent} hrs`;
  if (rateEl) rateEl.textContent = `${overallPct}%`;
}

function renderTable(rows) {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">
          No subject hours match your current filters.
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${row.subject.subjectName}</strong></td>
      <td><span class="subject-code-tag">${row.subject.subjectCode}</span></td>
      <td>${row.conductedHours} hrs</td>
      <td style="color: var(--safe); font-weight: 600;">${row.attendedHours} hrs</td>
      <td style="color: var(--shortage); font-weight: 600;">${row.absentHours} hrs</td>
      <td><strong style="color: ${row.statusInfo.isSafe ? 'var(--safe)' : 'var(--shortage)'};">${row.pct}%</strong></td>
      <td>${row.target}%</td>
      <td>
        <span class="badge ${row.statusInfo.badgeClass}">${row.statusInfo.status}</span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm btn-edit-hours" data-subject-id="${row.subject.id}">
          ✏ Adjust Hours
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach modal trigger
  tbody.querySelectorAll('.btn-edit-hours').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      const row = tableRowsData.find((r) => Number(r.subject.id) === Number(subjectId));
      if (row) openEditModal(row);
    });
  });
}

function initModalEvents() {
  const modal = document.getElementById('edit-attendance-modal');
  const closeBtn = document.getElementById('modal-close-history');
  const cancelBtn = document.getElementById('btn-cancel-edit-history');
  const form = document.getElementById('edit-attendance-form');
  const condInput = document.getElementById('edit-conducted-hours');
  const attInput = document.getElementById('edit-attended-hours');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  const updatePreview = () => {
    const c = parseInt(condInput.value, 10) || 0;
    const a = parseInt(attInput.value, 10) || 0;
    const previewEl = document.getElementById('edit-preview-pct');
    if (!previewEl) return;
    if (c === 0) {
      previewEl.textContent = '0% (0 conducted hours)';
    } else if (a > c) {
      previewEl.textContent = 'Invalid: Attended hours cannot exceed Conducted hours';
      previewEl.style.color = 'var(--shortage)';
      return;
    } else {
      const pct = ((a / c) * 100).toFixed(1);
      const absent = c - a;
      previewEl.textContent = `${pct}% (${a} attended, ${absent} absent)`;
      previewEl.style.color = 'var(--primary)';
    }
  };

  if (condInput) condInput.addEventListener('input', updatePreview);
  if (attInput) attInput.addEventListener('input', updatePreview);
  if (form) form.addEventListener('submit', handleFormSubmit);
}

function openEditModal(row) {
  const modal = document.getElementById('edit-attendance-modal');
  if (!modal) return;

  document.getElementById('edit-record-id').value = row.recordId || '';
  document.getElementById('edit-record-subject-id').value = row.subject.id;
  document.getElementById('edit-record-subject-name').value = `${row.subject.subjectName} (${row.subject.subjectCode})`;
  document.getElementById('edit-conducted-hours').value = row.conductedHours;
  document.getElementById('edit-attended-hours').value = row.attendedHours;

  const previewEl = document.getElementById('edit-preview-pct');
  if (previewEl) {
    previewEl.textContent = `${row.pct}% (${row.attendedHours} attended, ${row.absentHours} absent)`;
    previewEl.style.color = 'var(--primary)';
  }

  // Clear errors
  document.querySelectorAll('#edit-attendance-modal .invalid-feedback').forEach((el) => {
    el.textContent = '';
  });
  document.querySelectorAll('#edit-attendance-modal .is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
  });

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('edit-attendance-modal');
  if (modal) modal.classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const recordId = document.getElementById('edit-record-id').value;
  const subjectId = Number(document.getElementById('edit-record-subject-id').value);
  const studentId = Number(getActiveStudentId());
  const conducted = parseInt(document.getElementById('edit-conducted-hours').value, 10);
  const attended = parseInt(document.getElementById('edit-attended-hours').value, 10);

  // Validate
  const validationEx = validateAttendanceStats(conducted, attended);
  if (validationEx && validationEx.hasErrors()) {
    for (const [field, msg] of Object.entries(validationEx.fieldErrors)) {
      const errEl = document.getElementById(`err-${field}`);
      if (errEl) errEl.textContent = msg;
      const inputEl = document.getElementById(`edit-${field.replace('Hours', '-hours')}`);
      if (inputEl) inputEl.classList.add('is-invalid');
    }
    showToast(validationEx.message, 'error');
    return;
  }

  try {
    const payload = {
      studentId,
      subjectId,
      conductedHours: conducted,
      attendedHours: attended,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (recordId) {
      await attendanceService.updateAttendance(recordId, { ...payload, id: Number(recordId) });
      showToast('Attendance hours updated successfully!', 'success');
    } else {
      await attendanceService.createAttendance(payload);
      showToast('Attendance hours saved successfully!', 'success');
    }

    closeModal();
    loadHistoryData();
  } catch (error) {
    console.error('Error saving hours:', error);
  }
}
