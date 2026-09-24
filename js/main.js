/**
 * main.js
 * Dashboard Controller (views/index.html)
 * DOM manipulation, event listeners, calls services.
 * NO direct Axios calls.
 */

import { studentService } from './service/studentService.js';
import { subjectService } from './service/subjectService.js';
import { attendanceService } from './service/attendanceService.js';
import { timetableService } from './service/timetableService.js';
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
  getAttendanceStatus,
  calculateStreaks,
  getActiveStudentId,
  setActiveStudentId,
  showToast
} from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  loadDashboardData();

  window.addEventListener('app:student-changed', () => {
    loadDashboardData();
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

/**
 * Populate topbar student switcher and bind change handler
 */
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
      showToast(`Switched active student profile.`, 'info');
    });
  } catch (error) {
    console.error('Failed to initialize student switcher:', error);
  }
}

/**
 * Load all data for the active student and render the dashboard
 */
async function loadDashboardData() {
  const studentId = getActiveStudentId();

  try {
    const [student, subjects, attendanceRecords, timetableEntries] = await Promise.all([
      studentService.getStudentById(studentId).catch(() => null),
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId),
      timetableService.getTimetableByStudent(studentId)
    ]);

    renderStudentBanner(student);
    renderDashboardStatsAndCards(subjects, attendanceRecords);
    renderTodaySchedule(timetableEntries, subjects);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function renderStudentBanner(student) {
  const nameEl = document.getElementById('banner-student-name');
  const infoEl = document.getElementById('banner-student-info');
  const tagsEl = document.getElementById('banner-meta-tags');

  if (!student) {
    nameEl.textContent = 'Student Not Found';
    infoEl.textContent = 'Please configure or select a valid student profile in the Student section.';
    tagsEl.innerHTML = '';
    return;
  }

  nameEl.textContent = `Welcome, ${student.name}`;
  infoEl.textContent = `${student.course} - ${student.branch} | Section ${student.section || 'N/A'}`;

  tagsEl.innerHTML = `
    <span class="meta-tag">Roll: ${student.rollNumber}</span>
    <span class="meta-tag">Semester: ${student.semester || 'N/A'}</span>
    <span class="meta-tag">${student.email}</span>
  `;
}

function renderDashboardStatsAndCards(subjects, attendanceRecords) {
  let totalAttended = 0;
  let totalConducted = 0;
  let safeCount = 0;
  let nearCount = 0;
  let shortageCount = 0;
  const shortageSubjects = [];

  const subjectCardsContainer = document.getElementById('dashboard-subject-cards');
  subjectCardsContainer.innerHTML = '';

  if (!subjects || subjects.length === 0) {
    subjectCardsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">No Subjects Enrolled</div>
        <div class="empty-state-text">You have not added any subjects yet. Start by adding your semester subjects.</div>
        <a href="subjects.html" class="btn btn-primary">+ Add Subject</a>
      </div>
    `;
    updateStatCounters(0, 0, 0, 0, 0, 0, 0, 0);
    return;
  }

  // Pre-calculate per-subject aggregate attendance hours
  const subjectStats = subjects.map((subj) => {
    const record = (attendanceRecords || []).find((r) => Number(r.subjectId) === Number(subj.id));
    const conducted = record ? Number(record.conductedHours) || 0 : 0;
    const attended = record ? Number(record.attendedHours) || 0 : 0;
    const absent = Math.max(0, conducted - attended);
    const pct = calculateSubjectAttendance(attended, conducted);
    const target = Number(subj.targetAttendance) || 75;
    const statusInfo = getAttendanceStatus(pct, target);

    totalAttended += attended;
    totalConducted += conducted;

    if (statusInfo.isSafe) {
      safeCount += 1;
    } else if (statusInfo.isNearTarget) {
      nearCount += 1;
      shortageSubjects.push({
        name: subj.subjectName,
        code: subj.subjectCode,
        currentPct: pct,
        targetPct: target,
        type: 'Near Target'
      });
    } else {
      shortageCount += 1;
      shortageSubjects.push({
        name: subj.subjectName,
        code: subj.subjectCode,
        currentPct: pct,
        targetPct: target,
        type: 'Shortage'
      });
    }

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

  // Calculate overall attendance: SUM(Attended) / SUM(Conducted) * 100
  const overallPct = calculateOverallAttendance(totalAttended, totalConducted);
  const totalAbsent = Math.max(0, totalConducted - totalAttended);

  // Update Top Stats Grid
  updateStatCounters(
    overallPct,
    subjects.length,
    totalConducted,
    totalAttended,
    totalAbsent,
    safeCount,
    nearCount,
    shortageCount
  );

  // Shortage & Near Target Warning Banner
  const shortageBanner = document.getElementById('shortage-banner');
  const shortageList = document.getElementById('warning-subjects-list');
  if (shortageSubjects.length > 0) {
    shortageBanner.style.display = 'flex';
    shortageList.innerHTML = shortageSubjects
      .map(
        (s) =>
          `<span class="warning-subject-chip" style="background-color: ${s.type === 'Shortage' ? '#fef2f2' : '#fffbeb'}; color: ${s.type === 'Shortage' ? 'var(--shortage)' : 'var(--warning)'}; border-color: ${s.type === 'Shortage' ? 'var(--shortage-border)' : 'var(--warning-border)'};">${s.code}: ${s.currentPct}% (${s.type}, Target: ${s.targetPct}%)</span>`
      )
      .join('');
  } else {
    shortageBanner.style.display = 'none';
    shortageList.innerHTML = '';
  }

  // Render Subject Cards
  subjectStats.forEach((subj) => {
    const card = document.createElement('div');
    card.className = 'dash-subject-card';

    let fillClass = 'progress-fill-safe';
    let statColor = 'var(--safe)';
    if (subj.statusInfo.isShortage) {
      fillClass = 'progress-fill-shortage';
      statColor = 'var(--shortage)';
    } else if (subj.statusInfo.isNearTarget) {
      fillClass = 'progress-fill-shortage';
      statColor = 'var(--warning)';
    }

    card.innerHTML = `
      <div>
        <div class="dash-subject-top">
          <span class="dash-subject-code">${subj.subjectCode}</span>
          <span class="badge ${subj.statusInfo.badgeClass}">${subj.statusInfo.status}</span>
        </div>
        <h3 class="dash-subject-title">${subj.subjectName}</h3>
        <div class="dash-subject-faculty">${subj.faculty || 'Faculty TBA'}</div>
        
        <div class="dash-subject-metrics">
          <div class="dash-subject-pct" style="color: ${statColor};">
            ${subj.pct}%
          </div>
          <div class="dash-subject-counts">${subj.attended} / ${subj.conducted} hrs attended</div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill ${fillClass}" style="width: ${subj.pct}%;"></div>
        </div>

        <div class="dash-subject-target">
          <span>Target: <strong>${subj.target}%</strong></span>
          <span>Absent: <strong>${subj.absent} hrs</strong></span>
        </div>
      </div>
      <div style="margin-top: 14px; display: flex; gap: 8px;">
        <a href="attendance.html" class="btn btn-outline btn-sm" style="flex: 1;">Mark Hours</a>
        <a href="planner.html?subjectId=${subj.id}" class="btn btn-secondary btn-sm" style="flex: 1;">Planner</a>
      </div>
    `;

    subjectCardsContainer.appendChild(card);
  });
}

function updateStatCounters(overallPct, subjectsCount, conducted, attended, absent, safe, near, shortage) {
  document.getElementById('banner-overall-pct').textContent = `${overallPct}%`;
  document.getElementById('stat-overall-pct').textContent = `${overallPct}%`;
  document.getElementById('stat-subjects-count').textContent = subjectsCount;
  document.getElementById('stat-hours-conducted').textContent = `${conducted} hrs`;
  document.getElementById('stat-hours-attended').textContent = `${attended} hrs`;
  document.getElementById('stat-hours-absent').textContent = `${absent} hrs`;
  document.getElementById('stat-safe-count').textContent = safe;
  document.getElementById('stat-near-count').textContent = near;
  document.getElementById('stat-shortage-count').textContent = shortage;
}

function renderTodaySchedule(timetableEntries, subjects) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = daysOfWeek[new Date().getDay()];

  const labelEl = document.getElementById('today-day-label');
  labelEl.textContent = `${today}'s classes`;

  const scheduleList = document.getElementById('today-schedule-list');
  scheduleList.innerHTML = '';

  const todayEntries = (timetableEntries || []).filter((e) => e.day === today);

  if (todayEntries.length === 0) {
    scheduleList.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
        No classes scheduled for today (${today}).
      </div>
    `;
    return;
  }

  // Sort by start time
  todayEntries.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  todayEntries.forEach((entry) => {
    const subj = (subjects || []).find((s) => Number(s.id) === Number(entry.subjectId));
    const subjName = subj ? subj.subjectName : `Subject #${entry.subjectId}`;
    const subjCode = subj ? subj.subjectCode : '';

    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.innerHTML = `
      <div class="schedule-time">${entry.startTime} - ${entry.endTime}</div>
      <div class="schedule-details">
        <div class="schedule-subject">${subjName} ${subjCode ? `(${subjCode})` : ''}</div>
        <div class="schedule-room">Room: ${entry.room || 'TBA'}</div>
      </div>
    `;
    scheduleList.appendChild(item);
  });
}
