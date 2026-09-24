/**
 * reports.js
 * Attendance Reports & Analytics Controller (views/reports.html)
 * DOM manipulation, event listeners, calls studentService, subjectService & attendanceService.
 * NO direct Axios calls.
 */

import { studentService } from './service/studentService.js';
import { subjectService } from './service/subjectService.js';
import { attendanceService } from './service/attendanceService.js';
import {
  calculateSubjectAttendance,
  calculateOverallAttendance,
  getAttendanceStatus,
  getActiveStudentId,
  setActiveStudentId,
  showToast
} from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initStudentSwitcher();
  initPrintButton();
  loadReportData();

  window.addEventListener('app:student-changed', () => {
    loadReportData();
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

function initPrintButton() {
  const printBtn = document.getElementById('btn-print-report');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

async function loadReportData() {
  const studentId = getActiveStudentId();

  // Set Generation Date
  const now = new Date();
  document.getElementById('report-generation-date').textContent = `Generated on: ${now.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  try {
    const [student, subjects, attendance] = await Promise.all([
      studentService.getStudentById(studentId).catch(() => null),
      subjectService.getSubjectsByStudent(studentId),
      attendanceService.getAttendanceByStudent(studentId)
    ]);

    renderStudentInfo(student);
    renderReportTablesAndAnalytics(subjects || [], attendance || []);
  } catch (error) {
    console.error('Failed to load report data:', error);
  }
}

function renderStudentInfo(student) {
  if (!student) return;

  document.getElementById('rep-student-name').textContent = student.name;
  document.getElementById('rep-student-roll').textContent = student.rollNumber;
  document.getElementById('rep-student-course').textContent = `${student.course || 'B.Tech'} (${student.branch || 'CSE'})`;
  document.getElementById('rep-student-sem').textContent = `Sec ${student.section || 'A'} | Sem ${student.semester || '5'}`;
}

function renderReportTablesAndAnalytics(subjects, attendanceRecords) {
  let totalAttended = 0;
  let totalConducted = 0;
  let totalAbsent = 0;
  let safeCount = 0;
  let shortageCount = 0;

  const tbody = document.getElementById('report-table-body');
  const tfoot = document.getElementById('report-table-foot');
  const barsContainer = document.getElementById('analytics-bars-list');

  tbody.innerHTML = '';
  tfoot.innerHTML = '';
  barsContainer.innerHTML = '';

  if (subjects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No enrolled subjects found for this student.
        </td>
      </tr>
    `;
    document.getElementById('rep-overall-status').innerHTML = '<span class="badge badge-warning">NO DATA</span>';
    return;
  }

  const subjectRows = subjects.map((subj) => {
    const record = attendanceRecords.find((r) => Number(r.subjectId) === Number(subj.id));
    const conducted = record ? (Number(record.conductedHours) || 0) : 0;
    const attended = record ? (Number(record.attendedHours) || 0) : 0;
    const absent = Math.max(0, conducted - attended);
    const pct = calculateSubjectAttendance(attended, conducted);
    const target = Number(subj.targetAttendance) || 75;
    const statusInfo = getAttendanceStatus(pct, target);

    totalConducted += conducted;
    totalAttended += attended;
    totalAbsent += absent;

    if (statusInfo.isSafe) {
      safeCount++;
    } else {
      shortageCount++;
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

  // Calculate Overall
  const overallPct = calculateOverallAttendance(totalAttended, totalConducted);
  const overallStatus = getAttendanceStatus(overallPct, 75);

  document.getElementById('rep-overall-status').innerHTML = `
    <span class="badge ${overallStatus.badgeClass}">${overallPct}% (${overallStatus.status})</span>
  `;

  // Render Table Rows
  subjectRows.forEach((subj) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${subj.subjectName}</strong></td>
      <td><span class="subject-code-tag">${subj.subjectCode}</span></td>
      <td>${subj.faculty || 'Faculty TBA'}</td>
      <td>${subj.conducted} hrs</td>
      <td style="color: var(--safe); font-weight: 600;">${subj.attended} hrs</td>
      <td style="color: var(--shortage); font-weight: 600;">${subj.absent} hrs</td>
      <td><strong style="color: ${subj.statusInfo.isSafe ? 'var(--safe)' : 'var(--shortage)'};">${subj.pct}%</strong></td>
      <td>${subj.target}%</td>
      <td><span class="badge ${subj.statusInfo.badgeClass}">${subj.statusInfo.status}</span></td>
    `;
    tbody.appendChild(tr);

    // Render Analytics Bar
    const barItem = document.createElement('div');
    barItem.className = 'chart-bar-item';
    const barColor = subj.statusInfo.isSafe ? 'var(--safe)' : 'var(--shortage)';

    barItem.innerHTML = `
      <div class="chart-bar-labels">
        <span>${subj.subjectName} (${subj.subjectCode})</span>
        <span>${subj.pct}% (Target: ${subj.target}%)</span>
      </div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width: ${subj.pct}%; background-color: ${barColor};"></div>
        <div class="chart-target-marker" style="left: ${subj.target}%;" title="Target: ${subj.target}%"></div>
      </div>
    `;
    barsContainer.appendChild(barItem);
  });

  // Render Summary Footer Row
  tfoot.innerHTML = `
    <tr>
      <td colspan="3" style="text-align: right;">OVERALL TOTALS:</td>
      <td>${totalConducted} hrs</td>
      <td style="color: var(--safe);">${totalAttended} hrs</td>
      <td style="color: var(--shortage);">${totalAbsent} hrs</td>
      <td style="font-size: 16px; color: ${overallStatus.isSafe ? 'var(--safe)' : 'var(--shortage)'};">${overallPct}%</td>
      <td>75% (Min)</td>
      <td><span class="badge ${overallStatus.badgeClass}">${overallStatus.status}</span></td>
    </tr>
  `;

  // Render Distribution & Counts
  const attendedRate = totalConducted > 0 ? ((totalAttended / totalConducted) * 100).toFixed(1) : 0;
  const absentRate = totalConducted > 0 ? ((totalAbsent / totalConducted) * 100).toFixed(1) : 0;

  const distAttendedEl = document.getElementById('rep-dist-attended');
  const distAbsentEl = document.getElementById('rep-dist-absent');
  const safeCountEl = document.getElementById('rep-safe-count');
  const shortageCountEl = document.getElementById('rep-shortage-count');

  if (distAttendedEl) distAttendedEl.textContent = `${totalAttended} hrs (${attendedRate}%)`;
  if (distAbsentEl) distAbsentEl.textContent = `${totalAbsent} hrs (${absentRate}%)`;
  if (safeCountEl) safeCountEl.textContent = safeCount;
  if (shortageCountEl) shortageCountEl.textContent = shortageCount;
}
