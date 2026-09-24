/**
 * timetable.js
 * Weekly Timetable Schedule Controller (views/timetable.html)
 * DOM manipulation, event listeners, calls timetableService & subjectService.
 * Validates using exception/validationException.js.
 * NO direct Axios calls.
 */

import { timetableService } from './service/timetableService.js';
import { subjectService } from './service/subjectService.js';
import { studentService } from './service/studentService.js';
import { validateTimetable } from '../exception/validationException.js';
import { getActiveStudentId, setActiveStudentId, showToast } from './utils.js';

let studentSubjects = [];
let allTimetableEntries = [];
let activeDayFilter = 'ALL';

const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7
};

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initDayTabs();
  initModalEvents();
  initTimetableImageUpload();
  loadTimetableImage();
  loadTimetableData();

  window.addEventListener('app:student-changed', () => {
    loadTimetableImage();
    loadTimetableData();
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

function initDayTabs() {
  const tabs = document.querySelectorAll('.day-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeDayFilter = tab.getAttribute('data-day');
      renderTimetableGrid();
    });
  });
}

async function loadTimetableData() {
  const studentId = getActiveStudentId();

  try {
    const [subjects, timetable] = await Promise.all([
      subjectService.getSubjectsByStudent(studentId),
      timetableService.getTimetableByStudent(studentId)
    ]);

    studentSubjects = subjects || [];
    allTimetableEntries = timetable || [];

    // Sort by day order then start time
    allTimetableEntries.sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
      if (dayDiff !== 0) return dayDiff;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    populateSubjectSelectInModal();
    renderTimetableGrid();
  } catch (error) {
    console.error('Failed to load timetable:', error);
  }
}

function populateSubjectSelectInModal() {
  const select = document.getElementById('timetable-subject');
  select.innerHTML = '';

  if (studentSubjects.length === 0) {
    select.innerHTML = '<option value="">-- No Subjects Available --</option>';
    return;
  }

  studentSubjects.forEach((subj) => {
    const opt = document.createElement('option');
    opt.value = subj.id;
    opt.textContent = `${subj.subjectName} (${subj.subjectCode})`;
    select.appendChild(opt);
  });
}

function renderTimetableGrid() {
  const grid = document.getElementById('timetable-grid');
  grid.innerHTML = '';

  const filtered = allTimetableEntries.filter((entry) => {
    return activeDayFilter === 'ALL' || entry.day === activeDayFilter;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-title">No Classes Scheduled</div>
        <div class="empty-state-text">No class slots found for ${activeDayFilter === 'ALL' ? 'this student' : activeDayFilter}.</div>
      </div>
    `;
    return;
  }

  filtered.forEach((entry) => {
    const subj = studentSubjects.find((s) => Number(s.id) === Number(entry.subjectId));
    const subjName = subj ? subj.subjectName : `Subject #${entry.subjectId}`;
    const subjCode = subj ? subj.subjectCode : '';
    const faculty = subj ? subj.faculty : '';

    const card = document.createElement('div');
    card.className = 'schedule-card';

    card.innerHTML = `
      <div>
        <div class="schedule-card-header">
          <span class="schedule-time-badge">⏰ ${entry.startTime} - ${entry.endTime}</span>
          <span class="schedule-day-badge">${entry.day}</span>
        </div>

        <h3 class="schedule-subject-name">${subjName} ${subjCode ? `<span style="font-size: 13px; color: var(--primary);">(${subjCode})</span>` : ''}</h3>
        <div style="font-size: 13px; color: var(--text-muted);">${faculty || 'Faculty TBA'}</div>

        <div class="schedule-meta">
          <span>Room: <span class="schedule-room-badge">${entry.room}</span></span>
        </div>
      </div>

      <div class="schedule-actions">
        <button class="btn btn-secondary btn-sm btn-edit-tt" data-id="${entry.id}">Edit</button>
        <button class="btn btn-danger btn-sm btn-delete-tt" data-id="${entry.id}">Delete</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Attach button events
  grid.querySelectorAll('.btn-edit-tt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const entry = allTimetableEntries.find((e) => Number(e.id) === Number(id));
      if (entry) openTimetableModal(entry);
    });
  });

  grid.querySelectorAll('.btn-delete-tt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleDeleteTimetable(id);
    });
  });
}

function initModalEvents() {
  const modal = document.getElementById('timetable-modal');
  const addBtn = document.getElementById('btn-add-schedule');
  const closeBtn = document.getElementById('timetable-modal-close');
  const cancelBtn = document.getElementById('btn-cancel-timetable');
  const form = document.getElementById('timetable-form');

  addBtn.addEventListener('click', () => openTimetableModal());
  closeBtn.addEventListener('click', () => closeTimetableModal());
  cancelBtn.addEventListener('click', () => closeTimetableModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeTimetableModal();
  });

  form.addEventListener('submit', handleTimetableSubmit);
}

function openTimetableModal(entry = null) {
  clearTimetableErrors();
  const modal = document.getElementById('timetable-modal');
  const title = document.getElementById('timetable-modal-title');

  if (studentSubjects.length === 0) {
    showToast('Please add subjects first before configuring timetable.', 'warning');
    return;
  }

  if (entry) {
    title.textContent = 'Edit Class Slot';
    document.getElementById('timetable-id').value = entry.id;
    document.getElementById('timetable-subject').value = entry.subjectId;
    document.getElementById('timetable-day').value = entry.day;
    document.getElementById('timetable-start').value = entry.startTime;
    document.getElementById('timetable-end').value = entry.endTime;
    document.getElementById('timetable-room').value = entry.room;
  } else {
    title.textContent = 'Add Class Slot';
    document.getElementById('timetable-form').reset();
    document.getElementById('timetable-id').value = '';
    document.getElementById('timetable-start').value = '09:00';
    document.getElementById('timetable-end').value = '10:00';
    document.getElementById('timetable-room').value = 'LH-101';
  }

  modal.classList.add('active');
}

function closeTimetableModal() {
  const modal = document.getElementById('timetable-modal');
  modal.classList.remove('active');
  clearTimetableErrors();
}

function clearTimetableErrors() {
  document.querySelectorAll('.invalid-feedback').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-control, .form-select').forEach((el) => el.classList.remove('is-invalid'));
}

async function handleTimetableSubmit(e) {
  e.preventDefault();
  clearTimetableErrors();

  const id = document.getElementById('timetable-id').value;
  const studentId = getActiveStudentId();

  const entryData = {
    studentId: Number(studentId),
    subjectId: Number(document.getElementById('timetable-subject').value),
    day: document.getElementById('timetable-day').value,
    startTime: document.getElementById('timetable-start').value,
    endTime: document.getElementById('timetable-end').value,
    room: document.getElementById('timetable-room').value.trim()
  };

  const validationEx = validateTimetable(entryData);
  if (validationEx && validationEx.hasErrors()) {
    const fieldIdMap = {
      subjectId: 'timetable-subject',
      day: 'timetable-day',
      startTime: 'timetable-start',
      endTime: 'timetable-end',
      room: 'timetable-room'
    };
    for (const [field, message] of Object.entries(validationEx.fieldErrors)) {
      const errEl = document.getElementById(`err-${field}`);
      if (errEl) errEl.textContent = message;
      const inputEl = document.getElementById(fieldIdMap[field] || `timetable-${field}`);
      if (inputEl) inputEl.classList.add('is-invalid');
    }
    showToast(validationEx.message, 'error');
    return;
  }

  try {
    if (id) {
      await timetableService.updateTimetable(id, { ...entryData, id: Number(id) });
      showToast('Timetable slot updated successfully!', 'success');
    } else {
      await timetableService.createTimetable(entryData);
      showToast('Class added to timetable!', 'success');
    }

    closeTimetableModal();
    loadTimetableData();
  } catch (error) {
    console.error('Error saving timetable:', error);
  }
}

async function handleDeleteTimetable(id) {
  if (!window.confirm('Delete this class slot from the timetable?')) return;

  try {
    await timetableService.deleteTimetable(id);
    showToast('Class slot removed.', 'success');
    loadTimetableData();
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
  }
}

/**
 * Timetable Image Upload Implementation
 * Stores images locally in localStorage per student ID as base64 data URLs.
 */
function getTimetableStorageKey() {
  const studentId = getActiveStudentId();
  return `smart_attendance_timetable_img_${studentId}`;
}

function initTimetableImageUpload() {
  const fileInput = document.getElementById('timetable-file-input');
  const triggerBtn = document.getElementById('btn-trigger-upload');
  const selectFileBtn = document.getElementById('btn-select-file');
  const dropzone = document.getElementById('timetable-dropzone');
  const replaceBtn = document.getElementById('btn-replace-image');
  const removeBtn = document.getElementById('btn-remove-image');

  if (!fileInput || !dropzone) return;

  // Click triggers
  if (triggerBtn) triggerBtn.addEventListener('click', () => fileInput.click());
  if (selectFileBtn) selectFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  if (replaceBtn) replaceBtn.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('click', () => fileInput.click());

  // Drag & drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  // Remove image
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (!window.confirm('Are you sure you want to remove the uploaded timetable image?')) return;
      const key = getTimetableStorageKey();
      localStorage.removeItem(key);
      fileInput.value = '';
      loadTimetableImage();
      showToast('Timetable image removed.', 'info');
    });
  }
}

function handleImageFile(file) {
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    showToast('Invalid format. Please upload a JPG, PNG, or WebP image.', 'error');
    return;
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image is too large. Maximum file size is 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    const key = getTimetableStorageKey();
    try {
      localStorage.setItem(key, dataUrl);
      loadTimetableImage();
      showToast('Timetable image uploaded successfully!', 'success');
    } catch (err) {
      console.error('Storage error:', err);
      showToast('Could not save image (storage limit reached). Try a smaller image.', 'error');
    }
  };
  reader.onerror = () => {
    showToast('Failed to read image file.', 'error');
  };
  reader.readAsDataURL(file);
}

function loadTimetableImage() {
  const dropzone = document.getElementById('timetable-dropzone');
  const previewContainer = document.getElementById('timetable-preview-container');
  const imgDisplay = document.getElementById('timetable-image-display');
  const viewFullBtn = document.getElementById('btn-view-full');

  if (!dropzone || !previewContainer || !imgDisplay) return;

  const key = getTimetableStorageKey();
  const savedImage = localStorage.getItem(key);

  if (savedImage) {
    imgDisplay.src = savedImage;
    if (viewFullBtn) viewFullBtn.href = savedImage;
    dropzone.style.display = 'none';
    previewContainer.style.display = 'block';
  } else {
    imgDisplay.src = '';
    if (viewFullBtn) viewFullBtn.href = '#';
    dropzone.style.display = 'block';
    previewContainer.style.display = 'none';
  }
}
