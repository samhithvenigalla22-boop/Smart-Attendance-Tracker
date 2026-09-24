/**
 * planner.js
 * Attendance Planner & What-If Simulator Controller (views/planner.html)
 * Mathematical calculations, real-time DOM updates.
 * NO direct Axios calls. Pure simulation does not modify db.json.
 */

import { subjectService } from './service/subjectService.js';
import { attendanceService } from './service/attendanceService.js';
import { studentService } from './service/studentService.js';
import { validatePlannerInputs } from '../exception/validationException.js';
import {
  calculateSubjectAttendance,
  calculateClassesNeeded,
  calculateClassesCanMiss,
  simulateAttendance,
  getAttendanceStatus,
  getActiveStudentId,
  setActiveStudentId,
  showToast
} from './utils.js';

let studentSubjects = [];
let studentAttendance = [];

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initPlannerEvents();
  initSimulatorEvents();
  loadPlannerData();

  window.addEventListener('app:student-changed', () => {
    loadPlannerData();
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

async function loadPlannerData() {
  const studentId = getActiveStudentId();

  try {
    const [subjects, attendance] = await Promise.all([
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId)
    ]);

    studentSubjects = subjects || [];
    studentAttendance = attendance || [];

    populateSubjectSelect();
  } catch (error) {
    console.error('Failed to load planner data:', error);
  }
}

function populateSubjectSelect() {
  const select = document.getElementById('planner-subject-select');
  select.innerHTML = '<option value="CUSTOM">-- Custom / Manual Input --</option>';

  studentSubjects.forEach((subj) => {
    const opt = document.createElement('option');
    opt.value = subj.id;
    opt.textContent = `${subj.subjectName} (${subj.subjectCode})`;
    select.appendChild(opt);
  });

  // Check URL param ?subjectId=...
  const urlParams = new URLSearchParams(window.location.search);
  const paramSubjectId = urlParams.get('subjectId');

  if (paramSubjectId && studentSubjects.some((s) => Number(s.id) === Number(paramSubjectId))) {
    select.value = paramSubjectId;
    loadSubjectIntoPlanner(paramSubjectId);
  } else if (studentSubjects.length > 0) {
    select.value = studentSubjects[0].id;
    loadSubjectIntoPlanner(studentSubjects[0].id);
  } else {
    recalculatePlanner();
  }
}

function loadSubjectIntoPlanner(subjectId) {
  if (subjectId === 'CUSTOM') {
    recalculatePlanner();
    return;
  }

  const subj = studentSubjects.find((s) => Number(s.id) === Number(subjectId));
  if (!subj) return;

  const record = studentAttendance.find((r) => Number(r.subjectId) === Number(subj.id));
  const conducted = record ? Number(record.conductedHours) || 0 : 0;
  const attended = record ? Number(record.attendedHours) || 0 : 0;
  const target = Number(subj.targetAttendance) || 75;

  document.getElementById('planner-conducted').value = conducted;
  document.getElementById('planner-attended').value = attended;
  document.getElementById('planner-target').value = target;

  recalculatePlanner();
}

function initPlannerEvents() {
  const select = document.getElementById('planner-subject-select');
  const condInput = document.getElementById('planner-conducted');
  const attInput = document.getElementById('planner-attended');
  const targetInput = document.getElementById('planner-target');

  select.addEventListener('change', (e) => {
    loadSubjectIntoPlanner(e.target.value);
  });

  [condInput, attInput, targetInput].forEach((input) => {
    input.addEventListener('input', () => {
      recalculatePlanner();
    });
  });
}

function recalculatePlanner() {
  const conducted = Number(document.getElementById('planner-conducted').value) || 0;
  const attended = Number(document.getElementById('planner-attended').value) || 0;
  const target = Number(document.getElementById('planner-target').value) || 75;

  // Validation
  const validationEx = validatePlannerInputs(attended, conducted, target);
  if (validationEx && validationEx.hasErrors()) {
    const adviceEl = document.getElementById('plan-advice-banner');
    adviceEl.className = 'result-advice-banner advice-shortage';
    adviceEl.textContent = validationEx.getErrorList().join(' ');
    return;
  }

  const currentPct = calculateSubjectAttendance(attended, conducted);
  const statusInfo = getAttendanceStatus(currentPct, target);

  const neededResult = calculateClassesNeeded(attended, conducted, target);
  const canMissResult = calculateClassesCanMiss(attended, conducted, target);
  const neededHours = neededResult.hoursNeeded !== undefined ? neededResult.hoursNeeded : neededResult.classesNeeded;
  const canMissHours = canMissResult.hoursCanMiss !== undefined ? canMissResult.hoursCanMiss : canMissResult.classesCanMiss;

  // Update Planner UI Elements
  document.getElementById('plan-current-pct').textContent = `${currentPct}%`;
  document.getElementById('plan-status-badge').innerHTML = `
    <span class="badge ${statusInfo.badgeClass}">${statusInfo.status}</span>
  `;

  document.getElementById('plan-classes-needed').textContent = `${neededHours} hrs`;
  document.getElementById('plan-classes-can-miss').textContent = `${canMissHours} hrs`;

  const adviceEl = document.getElementById('plan-advice-banner');
  if (statusInfo.isSafe) {
    adviceEl.className = 'result-advice-banner advice-safe';
    adviceEl.textContent = `Safe Zone! You are currently at or above your ${target}% target. You can safely miss ${canMissHours} upcoming hours without falling below target.`;
  } else {
    adviceEl.className = 'result-advice-banner advice-shortage';
    adviceEl.textContent = `Shortage Warning! You are below your ${target}% target. You need to attend the next ${neededHours} consecutive hours to reach ${target}%.`;
  }

  // Update simulator with current values
  recalculateSimulator(attended, conducted, target);
}

function initSimulatorEvents() {
  const attendInput = document.getElementById('sim-attend-count');
  const missInput = document.getElementById('sim-miss-count');
  const incAttend = document.getElementById('btn-inc-attend');
  const decAttend = document.getElementById('btn-dec-attend');
  const incMiss = document.getElementById('btn-inc-miss');
  const decMiss = document.getElementById('btn-dec-miss');

  incAttend.addEventListener('click', () => {
    attendInput.value = Math.max(0, (parseInt(attendInput.value, 10) || 0) + 1);
    triggerSimCalc();
  });
  decAttend.addEventListener('click', () => {
    attendInput.value = Math.max(0, (parseInt(attendInput.value, 10) || 0) - 1);
    triggerSimCalc();
  });

  incMiss.addEventListener('click', () => {
    missInput.value = Math.max(0, (parseInt(missInput.value, 10) || 0) + 1);
    triggerSimCalc();
  });
  decMiss.addEventListener('click', () => {
    missInput.value = Math.max(0, (parseInt(missInput.value, 10) || 0) - 1);
    triggerSimCalc();
  });

  attendInput.addEventListener('input', triggerSimCalc);
  missInput.addEventListener('input', triggerSimCalc);
}

function triggerSimCalc() {
  const conducted = Number(document.getElementById('planner-conducted').value) || 0;
  const attended = Number(document.getElementById('planner-attended').value) || 0;
  const target = Number(document.getElementById('planner-target').value) || 75;
  recalculateSimulator(attended, conducted, target);
}

function recalculateSimulator(baseAttended, baseConducted, target) {
  const futureAttended = Math.max(0, Number(document.getElementById('sim-attend-count').value) || 0);
  const futureMissed = Math.max(0, Number(document.getElementById('sim-miss-count').value) || 0);

  const curPct = calculateSubjectAttendance(baseAttended, baseConducted);
  const curStatus = getAttendanceStatus(curPct, target);

  const simResult = simulateAttendance(baseAttended, baseConducted, futureAttended, futureMissed, target);

  // Update Current State Box
  document.getElementById('sim-cur-pct').textContent = `${curPct}%`;
  document.getElementById('sim-cur-counts').textContent = `${baseAttended} / ${baseConducted} hrs`;
  document.getElementById('sim-cur-badge').innerHTML = `
    <span class="badge ${curStatus.badgeClass}">${curStatus.status}</span>
  `;

  // Update Projected State Box
  document.getElementById('sim-proj-pct').textContent = `${simResult.simPct}%`;
  document.getElementById('sim-proj-counts').textContent = `${simResult.simAttended} / ${simResult.simConducted} hrs`;
  document.getElementById('sim-proj-badge').innerHTML = `
    <span class="badge ${simResult.badgeClass}">${simResult.status}</span>
  `;

  // Update Diff Tag
  const diffEl = document.getElementById('sim-diff-tag');
  if (simResult.diff >= 0) {
    diffEl.className = 'sim-diff-badge sim-diff-positive';
    diffEl.textContent = `+${simResult.diff}%`;
  } else {
    diffEl.className = 'sim-diff-badge sim-diff-negative';
    diffEl.textContent = `${simResult.diff}%`;
  }

  // Update Narrative Advice Banner
  const adviceEl = document.getElementById('sim-advice-banner');
  const actionText = [];
  if (futureAttended > 0) actionText.push(`attend ${futureAttended} hours`);
  if (futureMissed > 0) actionText.push(`miss ${futureMissed} hours`);
  const planPhrase = actionText.length > 0 ? `If you ${actionText.join(' and ')},` : 'With no upcoming hours simulated,';

  const diffPhrase = simResult.diff >= 0 ? `increase by ${simResult.diff}%` : `drop by ${Math.abs(simResult.diff)}%`;
  adviceEl.textContent = `${planPhrase} your attendance will reach ${simResult.simPct}% (${diffPhrase}) giving you a ${simResult.status} status.`;
}

