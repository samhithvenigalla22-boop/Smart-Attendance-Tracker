/**
 * student.js
 * Student Profile Controller (views/student.html)
 * DOM manipulation, event listeners, calls studentService.
 * Uses exception/validationException.js for form validation.
 * NO direct Axios calls.
 */

import { studentService } from './service/studentService.js';
import { validateStudent } from '../exception/validationException.js';
import { getActiveStudentId, setActiveStudentId, showToast } from './utils.js';

let allStudents = [];
let activeStudent = null;

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initModalEvents();
  loadStudentsData();

  window.addEventListener('app:student-changed', () => {
    loadStudentsData();
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
      showToast('Switched active student profile.', 'info');
    });
  } catch (error) {
    console.error('Failed to init student switcher:', error);
  }
}

async function loadStudentsData() {
  const activeId = getActiveStudentId();

  try {
    allStudents = await studentService.getAllStudents();
    activeStudent = allStudents.find((s) => Number(s.id) === Number(activeId)) || allStudents[0] || null;

    if (activeStudent && Number(activeStudent.id) !== Number(activeId)) {
      setActiveStudentId(activeStudent.id);
    }

    renderActiveProfile(activeStudent);
    renderStudentsTable(allStudents, activeStudent ? activeStudent.id : null);
  } catch (error) {
    console.error('Failed to load students:', error);
  }
}

function renderActiveProfile(student) {
  if (!student) {
    document.getElementById('avatar-initials').textContent = '?';
    document.getElementById('view-student-name').textContent = 'No Student Found';
    document.getElementById('view-student-roll').textContent = 'ROLL: ---';
    document.getElementById('view-student-email').textContent = '---';
    document.getElementById('view-student-course').textContent = '---';
    document.getElementById('view-student-branch').textContent = '---';
    document.getElementById('view-student-section').textContent = '---';
    document.getElementById('view-student-semester').textContent = '---';
    document.getElementById('view-student-email-box').textContent = '---';
    document.getElementById('view-student-id').textContent = '#---';
    return;
  }

  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('view-student-name').textContent = student.name;
  document.getElementById('view-student-roll').textContent = `ROLL: ${student.rollNumber}`;
  document.getElementById('view-student-email').textContent = student.email;
  document.getElementById('view-student-course').textContent = student.course || 'N/A';
  document.getElementById('view-student-branch').textContent = student.branch || 'N/A';
  document.getElementById('view-student-section').textContent = student.section || 'N/A';
  document.getElementById('view-student-semester').textContent = student.semester ? `Semester ${student.semester}` : 'N/A';
  document.getElementById('view-student-email-box').textContent = student.email;
  document.getElementById('view-student-id').textContent = `#${student.id}`;
}

function renderStudentsTable(students, activeId) {
  const tbody = document.getElementById('students-table-body');
  tbody.innerHTML = '';

  if (!students || students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No students registered yet. Click "+ Add New Student" to get started.
        </td>
      </tr>
    `;
    return;
  }

  students.forEach((s) => {
    const tr = document.createElement('tr');
    const isActive = Number(s.id) === Number(activeId);

    tr.innerHTML = `
      <td><strong>${s.rollNumber}</strong></td>
      <td>
        ${s.name} ${isActive ? '<span class="badge badge-info" style="margin-left: 6px;">Active</span>' : ''}
      </td>
      <td>${s.course || 'B.Tech'} - ${s.branch || 'CSE'}</td>
      <td>${s.section || 'A'}</td>
      <td>${s.semester || '5'}</td>
      <td>${s.email}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${!isActive ? `<button class="btn btn-outline btn-sm btn-select-student" data-id="${s.id}">Select</button>` : ''}
          <button class="btn btn-secondary btn-sm btn-edit-student" data-id="${s.id}">Edit</button>
          <button class="btn btn-danger btn-sm btn-delete-student" data-id="${s.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach button events
  tbody.querySelectorAll('.btn-select-student').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      setActiveStudentId(id);
      showToast('Switched active student.', 'info');
      initStudentSwitcher();
    });
  });

  tbody.querySelectorAll('.btn-edit-student').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const student = allStudents.find((s) => Number(s.id) === Number(id));
      if (student) openStudentModal(student);
    });
  });

  tbody.querySelectorAll('.btn-delete-student').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleDeleteStudent(id);
    });
  });
}

function initModalEvents() {
  const modal = document.getElementById('student-modal');
  const addBtn = document.getElementById('btn-add-student');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('btn-cancel');
  const form = document.getElementById('student-form');
  const editActiveBtn = document.getElementById('btn-edit-active');
  const deleteActiveBtn = document.getElementById('btn-delete-active');

  addBtn.addEventListener('click', () => openStudentModal());
  closeBtn.addEventListener('click', () => closeModal());
  cancelBtn.addEventListener('click', () => closeModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (editActiveBtn) {
    editActiveBtn.addEventListener('click', () => {
      if (activeStudent) openStudentModal(activeStudent);
    });
  }

  if (deleteActiveBtn) {
    deleteActiveBtn.addEventListener('click', () => {
      if (activeStudent) handleDeleteStudent(activeStudent.id);
    });
  }

  // Clear validation styling when user inputs new data
  const emailInput = document.getElementById('student-email');
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      emailInput.classList.remove('is-invalid');
      const err = document.getElementById('err-email');
      if (err) err.textContent = '';
    });
  }

  const rollInput = document.getElementById('student-rollNumber');
  if (rollInput) {
    rollInput.addEventListener('input', () => {
      rollInput.classList.remove('is-invalid');
      const err = document.getElementById('err-rollNumber');
      if (err) err.textContent = '';
    });
  }

  form.addEventListener('submit', handleFormSubmit);
}

function openStudentModal(student = null) {
  clearValidationErrors();
  const modal = document.getElementById('student-modal');
  const modalTitle = document.getElementById('modal-title');

  if (student) {
    modalTitle.textContent = 'Edit Student Profile';
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-rollNumber').value = student.rollNumber;
    document.getElementById('student-email').value = student.email;
    document.getElementById('student-course').value = student.course || '';
    document.getElementById('student-branch').value = student.branch || '';
    document.getElementById('student-section').value = student.section || '';
    document.getElementById('student-semester').value = student.semester || '';
  } else {
    modalTitle.textContent = 'Add New Student';
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
  }

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('student-modal');
  modal.classList.remove('active');
  clearValidationErrors();
}

function clearValidationErrors() {
  document.querySelectorAll('.invalid-feedback').forEach((el) => (el.textContent = ''));
  document.querySelectorAll('.form-control').forEach((el) => el.classList.remove('is-invalid'));
}

async function handleFormSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  const id = document.getElementById('student-id').value;
  const studentData = {
    name: document.getElementById('student-name').value.trim(),
    rollNumber: document.getElementById('student-rollNumber').value.trim(),
    email: document.getElementById('student-email').value.trim(),
    course: document.getElementById('student-course').value.trim(),
    branch: document.getElementById('student-branch').value.trim(),
    section: document.getElementById('student-section').value.trim(),
    semester: document.getElementById('student-semester').value.trim()
  };

  // Re-fetch latest students list to guarantee fresh uniqueness validation
  let freshStudents = allStudents;
  try {
    freshStudents = await studentService.getAllStudents();
    allStudents = freshStudents;
  } catch (err) {
    console.warn('Could not refresh students list, using cached list for duplicate check:', err);
  }

  // Run centralized validation with duplicate check (before any POST or PUT Axios call)
  const currentId = id ? (isNaN(Number(id)) ? id : Number(id)) : null;
  const validationException = validateStudent(studentData, freshStudents, currentId);
  if (validationException && validationException.hasErrors()) {
    let firstInvalidField = null;
    for (const [field, message] of Object.entries(validationException.fieldErrors)) {
      const errEl = document.getElementById(`err-${field}`);
      const inputEl = document.getElementById(`student-${field}`);
      if (errEl) errEl.textContent = message;
      if (inputEl) {
        inputEl.classList.add('is-invalid');
        if (!firstInvalidField) firstInvalidField = inputEl;
      }
    }
    if (firstInvalidField) firstInvalidField.focus();
    showToast(validationException.message, 'error');
    return;
  }

  try {
    if (id) {
      // Update existing
      await studentService.updateStudent(id, { ...studentData, id: Number(id) });
      showToast('Student profile updated successfully!', 'success');
    } else {
      // Create new
      const created = await studentService.createStudent(studentData);
      showToast('New student added successfully!', 'success');
      setActiveStudentId(created.id);
    }

    closeModal();
    initStudentSwitcher();
    loadStudentsData();
  } catch (error) {
    console.error('Error saving student:', error);
  }
}

async function handleDeleteStudent(id) {
  const student = allStudents.find((s) => Number(s.id) === Number(id));
  const confirmMsg = `Are you sure you want to delete ${student ? student.name : 'this student'}? This cannot be undone.`;

  if (!window.confirm(confirmMsg)) return;

  try {
    await studentService.deleteStudent(id);
    showToast('Student deleted successfully.', 'success');

    // If active was deleted, choose another student
    if (activeStudent && Number(activeStudent.id) === Number(id)) {
      const remaining = allStudents.filter((s) => Number(s.id) !== Number(id));
      if (remaining.length > 0) {
        setActiveStudentId(remaining[0].id);
      } else {
        localStorage.removeItem('smart_attendance_active_student_id');
      }
    }

    initStudentSwitcher();
    loadStudentsData();
  } catch (error) {
    console.error('Error deleting student:', error);
  }
}
