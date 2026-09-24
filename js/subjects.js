/**
 * subjects.js
 * Subject Management Controller (views/subjects.html)
 * DOM manipulation, event listeners, calls subjectService & attendanceService.
 * Validates using exception/validationException.js.
 * NO direct Axios calls.
 */

import { subjectService } from './service/subjectService.js';
import { attendanceService } from './service/attendanceService.js';
import { studentService } from './service/studentService.js';
import { validateSubject } from '../exception/validationException.js';
import {
  calculateSubjectAttendance,
  getAttendanceStatus,
  getActiveStudentId,
  setActiveStudentId,
  showToast
} from './utils.js';

let allSubjects = [];
let allAttendance = [];
let filteredSubjects = [];

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initSearchAndFilter();
  initModalEvents();
  loadSubjectsData();

  window.addEventListener('app:student-changed', () => {
    loadSubjectsData();
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

async function loadSubjectsData() {
  const studentId = getActiveStudentId();

  try {
    const [subjects, attendance] = await Promise.all([
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId)
    ]);

    allAttendance = attendance || [];

    // Calculate real stats for each subject
    allSubjects = (subjects || []).map((subj) => {
      const subjRecords = allAttendance.filter((r) => Number(r.subjectId) === Number(subj.id));
      const conducted = subjRecords.length;
      const attended = subjRecords.filter((r) => r.status === 'Present').length;
      const absent = conducted - attended;
      const pct = calculateSubjectAttendance(attended, conducted);
      const target = Number(subj.targetAttendance) || 75;
      const statusInfo = getAttendanceStatus(pct, target);

      return {
        ...subj,
        conducted,
        attended,
        absent,
        pct,
        target,
        statusInfo
      };
    });

    applySearchAndFilter();
  } catch (error) {
    console.error('Failed to load subjects:', error);
  }
}

function initSearchAndFilter() {
  const searchInput = document.getElementById('subject-search');
  const statusFilter = document.getElementById('subject-status-filter');

  searchInput.addEventListener('input', () => {
    applySearchAndFilter();
  });

  statusFilter.addEventListener('change', () => {
    applySearchAndFilter();
  });
}

function applySearchAndFilter() {
  const query = (document.getElementById('subject-search').value || '').trim().toLowerCase();
  const filterVal = document.getElementById('subject-status-filter').value;

  filteredSubjects = allSubjects.filter((subj) => {
    const matchesSearch =
      subj.subjectName.toLowerCase().includes(query) ||
      (subj.subjectCode && subj.subjectCode.toLowerCase().includes(query)) ||
      (subj.faculty && subj.faculty.toLowerCase().includes(query));

    let matchesFilter = true;
    if (filterVal === 'SAFE') {
      matchesFilter = subj.statusInfo.isSafe;
    } else if (filterVal === 'SHORTAGE') {
      matchesFilter = !subj.statusInfo.isSafe;
    }

    return matchesSearch && matchesFilter;
  });

  renderSubjectsGrid(filteredSubjects);
}

function renderSubjectsGrid(subjects) {
  const grid = document.getElementById('subjects-grid');
  grid.innerHTML = '';

  if (subjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Subjects Found</div>
        <div class="empty-state-text">No subjects matched your current search or filter criteria.</div>
      </div>
    `;
    return;
  }

  subjects.forEach((subj) => {
    const card = document.createElement('div');
    card.className = 'subject-card';

    const fillClass = subj.statusInfo.isSafe ? 'progress-fill-safe' : 'progress-fill-shortage';

    card.innerHTML = `
      <div>
        <div class="subject-card-header">
          <span class="subject-code-tag">${subj.subjectCode}</span>
          <span class="badge ${subj.statusInfo.badgeClass}">${subj.statusInfo.status}</span>
        </div>

        <h3 class="subject-name">${subj.subjectName}</h3>
        <div class="subject-faculty">${subj.faculty || 'Faculty: Not Assigned'}</div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 14px;">
          <div style="font-size: 26px; font-weight: 800; color: ${subj.statusInfo.isSafe ? 'var(--safe)' : 'var(--shortage)'};">
            ${subj.pct}%
          </div>
          <div style="font-size: 13px; color: var(--text-muted); font-weight: 600;">
            Target: ${subj.target}%
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill ${fillClass}" style="width: ${subj.pct}%;"></div>
        </div>

        <div class="subject-stats-bar">
          <div>
            <div class="stat-mini-label">Conducted</div>
            <div class="stat-mini-val">${subj.conducted}</div>
          </div>
          <div>
            <div class="stat-mini-label">Attended</div>
            <div class="stat-mini-val" style="color: var(--safe);">${subj.attended}</div>
          </div>
          <div>
            <div class="stat-mini-label">Absent</div>
            <div class="stat-mini-val" style="color: var(--shortage);">${subj.absent}</div>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 8px;">
          <span>Credits: <strong>${subj.credits || 0}</strong></span>
          <span>Classes/Week: <strong>${subj.classesPerWeek || 0}</strong></span>
        </div>
      </div>

      <div class="subject-card-footer">
        <div style="display: flex; gap: 6px;">
          <a href="attendance.html?subjectId=${subj.id}" class="btn btn-outline btn-sm">Mark</a>
          <a href="planner.html?subjectId=${subj.id}" class="btn btn-secondary btn-sm">Plan</a>
        </div>
        <div class="subject-actions">
          <button class="btn btn-outline btn-sm btn-edit-subject" data-id="${subj.id}" title="Edit Subject">✎</button>
          <button class="btn btn-danger btn-sm btn-delete-subject" data-id="${subj.id}" title="Delete Subject">🗑</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach card action listeners
  grid.querySelectorAll('.btn-edit-subject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const subj = allSubjects.find((s) => Number(s.id) === Number(id));
      if (subj) openSubjectModal(subj);
    });
  });

  grid.querySelectorAll('.btn-delete-subject').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleDeleteSubject(id);
    });
  });
}

function initModalEvents() {
  const modal = document.getElementById('subject-modal');
  const addBtn = document.getElementById('btn-add-subject');
  const closeBtn = document.getElementById('subject-modal-close');
  const cancelBtn = document.getElementById('btn-cancel-subject');
  const form = document.getElementById('subject-form');

  addBtn.addEventListener('click', () => openSubjectModal());
  closeBtn.addEventListener('click', () => closeSubjectModal());
  cancelBtn.addEventListener('click', () => closeSubjectModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSubjectModal();
  });

  form.addEventListener('submit', handleSubjectSubmit);
}

function openSubjectModal(subject = null) {
  clearSubjectErrors();
  const modal = document.getElementById('subject-modal');
  const title = document.getElementById('subject-modal-title');

  if (subject) {
    title.textContent = 'Edit Subject';
    document.getElementById('subject-id').value = subject.id;
    document.getElementById('subject-name').value = subject.subjectName;
    document.getElementById('subject-code').value = subject.subjectCode;
    document.getElementById('subject-faculty').value = subject.faculty || '';
    document.getElementById('subject-target').value = subject.targetAttendance || 75;
    document.getElementById('subject-credits').value = subject.credits || 4;
    document.getElementById('subject-classes-per-week').value = subject.classesPerWeek || 4;
  } else {
    title.textContent = 'Add New Subject';
    document.getElementById('subject-form').reset();
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-target').value = 75;
    document.getElementById('subject-credits').value = 4;
    document.getElementById('subject-classes-per-week').value = 4;
  }

  modal.classList.add('active');
}

function closeSubjectModal() {
  const modal = document.getElementById('subject-modal');
  modal.classList.remove('active');
  clearSubjectErrors();
}

function clearSubjectErrors() {
  document.querySelectorAll('.invalid-feedback').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-control').forEach((el) => el.classList.remove('is-invalid'));
}

async function handleSubjectSubmit(e) {
  e.preventDefault();
  clearSubjectErrors();

  const id = document.getElementById('subject-id').value;
  const studentId = getActiveStudentId();

  const subjectData = {
    studentId: Number(studentId),
    subjectName: document.getElementById('subject-name').value.trim(),
    subjectCode: document.getElementById('subject-code').value.trim().toUpperCase(),
    faculty: document.getElementById('subject-faculty').value.trim(),
    targetAttendance: Number(document.getElementById('subject-target').value),
    credits: Number(document.getElementById('subject-credits').value),
    classesPerWeek: Number(document.getElementById('subject-classes-per-week').value)
  };

  // Centralized domain validation
  const validationEx = validateSubject(subjectData);
  if (validationEx && validationEx.hasErrors()) {
    const fieldIdMap = {
      subjectName: 'subject-name',
      subjectCode: 'subject-code',
      targetAttendance: 'subject-target',
      credits: 'subject-credits',
      classesPerWeek: 'subject-classes-per-week'
    };
    for (const [field, message] of Object.entries(validationEx.fieldErrors)) {
      const errEl = document.getElementById(`err-${field}`);
      if (errEl) errEl.textContent = message;
      const inputEl = document.getElementById(fieldIdMap[field] || `subject-${field}`);
      if (inputEl) inputEl.classList.add('is-invalid');
    }
    showToast(validationEx.message, 'error');
    return;
  }

  try {
    if (id) {
      await subjectService.updateSubject(id, { ...subjectData, id: Number(id) });
      showToast('Subject updated successfully!', 'success');
    } else {
      await subjectService.createSubject(subjectData);
      showToast('New subject added successfully!', 'success');
    }

    closeSubjectModal();
    loadSubjectsData();
  } catch (error) {
    console.error('Error saving subject:', error);
  }
}

async function handleDeleteSubject(id) {
  const subj = allSubjects.find((s) => Number(s.id) === Number(id));
  const confirmMsg = `Are you sure you want to delete ${subj ? subj.subjectName : 'this subject'}?`;

  if (!window.confirm(confirmMsg)) return;

  try {
    await subjectService.deleteSubject(id);
    showToast('Subject deleted successfully.', 'success');
    loadSubjectsData();
  } catch (error) {
    console.error('Error deleting subject:', error);
  }
}
