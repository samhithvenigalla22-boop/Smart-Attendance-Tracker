/**
 * attendance.js
 * Hour-Based Attendance Recording Controller (views/attendance.html)
 * DOM manipulation, event listeners, calls attendanceService & subjectService.
 * Validates using exception/validationException.js.
 * NO direct Axios calls.
 */

import { attendanceService } from './service/attendanceService.js';
import { subjectService } from './service/subjectService.js';
import { studentService } from './service/studentService.js';
import { validateAttendance } from '../exception/validationException.js';
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
  getAttendanceStatus,
  getActiveStudentId,
  setActiveStudentId,
  showToast
} from './utils.js';

let currentSubjects = [];
let studentAttendance = [];

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initModalEvents();
  loadAttendanceData();

  window.addEventListener('app:student-changed', () => {
    loadAttendanceData();
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

async function loadAttendanceData() {
  const studentId = getActiveStudentId();

  try {
    const [subjects, attendance] = await Promise.all([
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId)
    ]);

    currentSubjects = subjects || [];
    studentAttendance = attendance || [];

    updateSummaryPills();
    renderAttendanceGrid();
  } catch (error) {
    console.error('Failed to load attendance data:', error);
  }
}

function updateSummaryPills() {
  let totalConducted = 0;
  let totalAttended = 0;

  studentAttendance.forEach((rec) => {
    totalConducted += Number(rec.conductedHours) || 0;
    totalAttended += Number(rec.attendedHours) || 0;
  });

  const totalAbsent = Math.max(0, totalConducted - totalAttended);
  const overallPct = calculateOverallAttendance(totalAttended, totalConducted);

  document.getElementById('total-conducted-pill').textContent = `${totalConducted} hrs`;
  document.getElementById('total-attended-pill').textContent = `${totalAttended} hrs`;
  document.getElementById('total-absent-pill').textContent = `${totalAbsent} hrs`;
  document.getElementById('total-overall-pill').textContent = `${overallPct}%`;
}

function renderAttendanceGrid() {
  const grid = document.getElementById('attendance-marker-grid');
  grid.innerHTML = '';

  if (currentSubjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">No Subjects Found</div>
        <div class="empty-state-text">Add subjects before recording attendance hours.</div>
        <a href="subjects.html" class="btn btn-primary">+ Add Subject</a>
      </div>
    `;
    return;
  }

  currentSubjects.forEach((subj) => {
    const record = studentAttendance.find((r) => Number(r.subjectId) === Number(subj.id));
    const conducted = record ? Number(record.conductedHours) || 0 : 0;
    const attended = record ? Number(record.attendedHours) || 0 : 0;
    const absent = Math.max(0, conducted - attended);
    const pct = calculateSubjectAttendance(attended, conducted);
    const target = Number(subj.targetAttendance) || 75;
    const statusInfo = getAttendanceStatus(pct, target);

    let cardBorderClass = 'card-safe';
    let fillClass = 'progress-fill-safe';
    if (statusInfo.isShortage) {
      cardBorderClass = 'card-shortage';
      fillClass = 'progress-fill-shortage';
    } else if (statusInfo.isNearTarget) {
      cardBorderClass = 'card-near';
      fillClass = 'progress-fill-shortage';
    }

    const card = document.createElement('div');
    card.className = `hours-card ${cardBorderClass}`;

    card.innerHTML = `
      <div>
        <div class="hours-card-header">
          <span class="marker-subject-code">${subj.subjectCode}</span>
          <span class="badge ${statusInfo.badgeClass}">${statusInfo.status}</span>
        </div>

        <h3 class="marker-subject-title">${subj.subjectName}</h3>
        <div style="font-size: 13px; color: var(--text-muted);">${subj.faculty || 'Faculty TBA'}</div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 14px;">
          <div style="font-size: 26px; font-weight: 800; color: ${statusInfo.isSafe ? 'var(--safe)' : statusInfo.isNearTarget ? 'var(--warning)' : 'var(--shortage)'};">
            ${pct}%
          </div>
          <div style="font-size: 13px; color: var(--text-muted); font-weight: 600;">
            Target: ${target}%
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
        </div>

        <!-- 3-Column Hours Breakdown -->
        <div class="hours-breakdown-grid">
          <div class="hour-stat-col">
            <div class="label">Conducted</div>
            <div class="val">${conducted} <span style="font-size: 11px; font-weight: normal;">hrs</span></div>
          </div>
          <div class="hour-stat-col">
            <div class="label">Attended</div>
            <div class="val val-attended">${attended} <span style="font-size: 11px; font-weight: normal;">hrs</span></div>
          </div>
          <div class="hour-stat-col">
            <div class="label">Absent</div>
            <div class="val val-absent">${absent} <span style="font-size: 11px; font-weight: normal;">hrs</span></div>
          </div>
        </div>
      </div>

      <div>
        <!-- Quick Action Buttons -->
        <div class="quick-btn-group">
          <button 
            type="button" 
            class="btn-quick-add" 
            data-subject-id="${subj.id}"
            data-record-id="${record ? record.id : ''}"
            data-conducted="${conducted}"
            data-attended="${attended}"
            title="Adds 1 attended hour (and 1 conducted hour)"
          >
            +1 Attended Hr
          </button>
          <button 
            type="button" 
            class="btn-quick-absent" 
            data-subject-id="${subj.id}"
            data-record-id="${record ? record.id : ''}"
            data-conducted="${conducted}"
            data-attended="${attended}"
            title="Adds 1 absent hour (increases conducted by 1)"
          >
            +1 Absent Hr
          </button>
        </div>

        <div class="hours-card-actions">
          <button 
            class="btn btn-secondary btn-sm btn-edit-hours" 
            data-subject-id="${subj.id}"
            data-record-id="${record ? record.id : ''}"
            data-name="${subj.subjectName}"
            data-conducted="${conducted}"
            data-attended="${attended}"
          >
            ✎ Edit Hours
          </button>
          ${record ? `
            <button 
              class="btn btn-outline btn-sm btn-delete-attendance" 
              data-record-id="${record.id}"
              title="Remove attendance entry"
            >
              Reset
            </button>
          ` : ''}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach quick action listeners
  grid.querySelectorAll('.btn-quick-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      const recordId = btn.getAttribute('data-record-id');
      const curConducted = Number(btn.getAttribute('data-conducted')) || 0;
      const curAttended = Number(btn.getAttribute('data-attended')) || 0;

      // Adding 1 attended hour means +1 attended AND +1 conducted to keep data valid
      handleQuickUpdate(subjectId, recordId, curConducted + 1, curAttended + 1, '+1 Attended hour recorded.');
    });
  });

  grid.querySelectorAll('.btn-quick-absent').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      const recordId = btn.getAttribute('data-record-id');
      const curConducted = Number(btn.getAttribute('data-conducted')) || 0;
      const curAttended = Number(btn.getAttribute('data-attended')) || 0;

      // Adding 1 absent hour means +1 conducted with same attended hours
      handleQuickUpdate(subjectId, recordId, curConducted + 1, curAttended, '+1 Absent hour recorded.');
    });
  });

  grid.querySelectorAll('.btn-edit-hours').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      const recordId = btn.getAttribute('data-record-id');
      const name = btn.getAttribute('data-name');
      const conducted = btn.getAttribute('data-conducted');
      const attended = btn.getAttribute('data-attended');
      openHoursModal(subjectId, recordId, name, conducted, attended);
    });
  });

  grid.querySelectorAll('.btn-delete-attendance').forEach((btn) => {
    btn.addEventListener('click', () => {
      const recordId = btn.getAttribute('data-record-id');
      handleDeleteAttendance(recordId);
    });
  });
}

async function handleQuickUpdate(subjectId, recordId, conducted, attended, msg) {
  const studentId = getActiveStudentId();

  const recordData = {
    studentId: Number(studentId),
    subjectId: Number(subjectId),
    conductedHours: Number(conducted),
    attendedHours: Number(attended),
    updatedAt: new Date().toISOString()
  };

  const validationEx = validateAttendance(recordData);
  if (validationEx && validationEx.hasErrors()) {
    showToast(validationEx.message, 'error');
    return;
  }

  try {
    if (recordId) {
      await attendanceService.updateAttendance(recordId, {
        ...recordData,
        id: Number(recordId)
      });
    } else {
      await attendanceService.createAttendance(recordData);
    }

    showToast(msg, 'success');
    await loadAttendanceData();
  } catch (error) {
    console.error('Error in quick update:', error);
  }
}

function initModalEvents() {
  const modal = document.getElementById('hours-modal');
  const closeBtn = document.getElementById('hours-modal-close');
  const cancelBtn = document.getElementById('btn-cancel-hours');
  const form = document.getElementById('hours-form');
  const condInput = document.getElementById('modal-conducted-hours');
  const attInput = document.getElementById('modal-attended-hours');

  closeBtn.addEventListener('click', closeHoursModal);
  cancelBtn.addEventListener('click', closeHoursModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeHoursModal();
  });

  [condInput, attInput].forEach((input) => {
    input.addEventListener('input', updateModalLivePreview);
  });

  form.addEventListener('submit', handleFormSubmit);
}

function openHoursModal(subjectId, recordId, subjectName, conducted, attended) {
  clearValidationErrors();
  const modal = document.getElementById('hours-modal');

  document.getElementById('modal-attendance-id').value = recordId || '';
  document.getElementById('modal-subject-id').value = subjectId;
  document.getElementById('modal-subject-display').value = subjectName;
  document.getElementById('modal-conducted-hours').value = conducted;
  document.getElementById('modal-attended-hours').value = attended;

  updateModalLivePreview();
  modal.classList.add('active');
}

function closeHoursModal() {
  const modal = document.getElementById('hours-modal');
  modal.classList.remove('active');
  clearValidationErrors();
}

function updateModalLivePreview() {
  const cond = Number(document.getElementById('modal-conducted-hours').value) || 0;
  const att = Number(document.getElementById('modal-attended-hours').value) || 0;

  const absent = Math.max(0, cond - att);
  const pct = calculateSubjectAttendance(att, cond);

  document.getElementById('modal-preview-absent').textContent = `${absent} hrs`;
  document.getElementById('modal-preview-pct').textContent = `${pct}%`;
}

function clearValidationErrors() {
  document.querySelectorAll('.invalid-feedback').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-control').forEach((el) => el.classList.remove('is-invalid'));
}

async function handleFormSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  const recordId = document.getElementById('modal-attendance-id').value;
  const subjectId = document.getElementById('modal-subject-id').value;
  const studentId = getActiveStudentId();
  const conducted = document.getElementById('modal-conducted-hours').value;
  const attended = document.getElementById('modal-attended-hours').value;

  const recordData = {
    studentId: Number(studentId),
    subjectId: Number(subjectId),
    conductedHours: conducted === '' ? '' : Number(conducted),
    attendedHours: attended === '' ? '' : Number(attended),
    updatedAt: new Date().toISOString()
  };

  const validationEx = validateAttendance(recordData);
  if (validationEx && validationEx.hasErrors()) {
    for (const [field, message] of Object.entries(validationEx.fieldErrors)) {
      const errEl = document.getElementById(`err-${field}`);
      const inputEl = document.getElementById(`modal-${field === 'conductedHours' ? 'conducted-hours' : 'attended-hours'}`);
      if (errEl) errEl.textContent = message;
      if (inputEl) inputEl.classList.add('is-invalid');
    }
    showToast(validationEx.message, 'error');
    return;
  }

  try {
    if (recordId) {
      await attendanceService.updateAttendance(recordId, {
        ...recordData,
        id: Number(recordId)
      });
      showToast('Attendance hours updated successfully!', 'success');
    } else {
      await attendanceService.createAttendance(recordData);
      showToast('Attendance record created successfully!', 'success');
    }

    closeHoursModal();
    await loadAttendanceData();
  } catch (error) {
    console.error('Error saving attendance hours:', error);
  }
}

async function handleDeleteAttendance(recordId) {
  if (!window.confirm('Reset/Delete attendance record for this subject?')) return;

  try {
    await attendanceService.deleteAttendance(recordId);
    showToast('Attendance record reset.', 'info');
    await loadAttendanceData();
  } catch (error) {
    console.error('Error deleting attendance record:', error);
  }
}
