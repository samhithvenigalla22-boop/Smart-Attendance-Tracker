/**
 * utils.js
 * Core Calculations, State Management & Shared UI Helpers
 * Pure logic and calculations, no direct Axios calls.
 */

/**
 * Get active student ID from localStorage or fallback to 1
 * @returns {number}
 */
export function getActiveStudentId() {
  const saved = localStorage.getItem('smart_attendance_active_student_id');
  return saved ? parseInt(saved, 10) : 1;
}

/**
 * Set active student ID in localStorage and notify listeners
 * @param {number|string} studentId 
 */
export function setActiveStudentId(studentId) {
  localStorage.setItem('smart_attendance_active_student_id', String(studentId));
  window.dispatchEvent(new CustomEvent('app:student-changed', { detail: { studentId } }));
}

/**
 * Calculate subject attendance percentage
 * @param {number} attended 
 * @param {number} conducted 
 * @returns {number} Percentage formatted to 2 decimal places (float)
 */
export function calculateSubjectAttendance(attended, conducted) {
  const att = Number(attended) || 0;
  const cond = Number(conducted) || 0;

  if (cond <= 0) return 0;
  if (att < 0) return 0;

  const pct = (att / cond) * 100;
  return Math.min(100, Math.max(0, Number(pct.toFixed(2))));
}

/**
 * Calculate overall attendance percentage across all subjects
 * Note: Formula is SUM(Attended) / SUM(Conducted) * 100, NEVER an average of percentages!
 * @param {number} totalAttended 
 * @param {number} totalConducted 
 * @returns {number}
 */
export function calculateOverallAttendance(totalAttended, totalConducted) {
  const att = Number(totalAttended) || 0;
  const cond = Number(totalConducted) || 0;

  if (cond <= 0) return 0;
  if (att < 0) return 0;

  const pct = (att / cond) * 100;
  return Math.min(100, Math.max(0, Number(pct.toFixed(2))));
}

/**
 * Determine status (SAFE, NEAR TARGET, or SHORTAGE)
 * @param {number} currentPercentage 
 * @param {number} targetPercentage 
 * @returns {{status: string, isSafe: boolean, isNearTarget: boolean, isShortage: boolean, badgeClass: string}}
 */
export function getAttendanceStatus(currentPercentage, targetPercentage = 75) {
  const current = Number(currentPercentage) || 0;
  const target = Number(targetPercentage) || 75;

  if (current >= target) {
    return {
      status: 'Safe',
      isSafe: true,
      isNearTarget: false,
      isShortage: false,
      badgeClass: 'badge-safe'
    };
  } else if (current >= target - 5) {
    return {
      status: 'Near Target',
      isSafe: false,
      isNearTarget: true,
      isShortage: false,
      badgeClass: 'badge-warning'
    };
  } else {
    return {
      status: 'Shortage',
      isSafe: false,
      isNearTarget: false,
      isShortage: true,
      badgeClass: 'badge-shortage'
    };
  }
}

/**
 * Calculate consecutive hours to attend to reach target
 * Formula: (T * C - 100 * A) / (100 - T)
 * @param {number} attended 
 * @param {number} conducted 
 * @param {number} targetPercent 
 * @returns {{classesNeeded: number, hoursNeeded: number, isPossible: boolean, message: string}}
 */
export function calculateHoursNeeded(attended, conducted, targetPercent = 75) {
  const A = Number(attended) || 0;
  const C = Number(conducted) || 0;
  const T = Number(targetPercent) || 75;

  if (C <= 0) {
    return { classesNeeded: 0, hoursNeeded: 0, isPossible: true, message: 'No hours conducted yet.' };
  }

  const currentPct = (A / C) * 100;
  if (currentPct >= T) {
    return { classesNeeded: 0, hoursNeeded: 0, isPossible: true, message: 'Target already achieved!' };
  }

  if (T >= 100) {
    if (A < C) {
      return { classesNeeded: 0, hoursNeeded: 0, isPossible: false, message: 'Cannot reach 100% because hours have already been missed.' };
    }
    return { classesNeeded: 0, hoursNeeded: 0, isPossible: true, message: 'Currently at 100%.' };
  }

  const numerator = (T * C) - (100 * A);
  const denominator = 100 - T;
  const needed = Math.ceil(numerator / denominator);
  const safeNeeded = Math.max(0, isFinite(needed) ? needed : 0);

  return {
    classesNeeded: safeNeeded,
    hoursNeeded: safeNeeded,
    isPossible: true,
    message: `Attend the next ${safeNeeded} consecutive hour${safeNeeded === 1 ? '' : 's'} to reach ${T}%.`
  };
}
export const calculateClassesNeeded = calculateHoursNeeded;

/**
 * Calculate hours that can be missed while staying at or above target
 * Formula: (100 * A - T * C) / T
 * @param {number} attended 
 * @param {number} conducted 
 * @param {number} targetPercent 
 * @returns {{classesCanMiss: number, hoursCanMiss: number, isSafe: boolean, message: string}}
 */
export function calculateHoursCanMiss(attended, conducted, targetPercent = 75) {
  const A = Number(attended) || 0;
  const C = Number(conducted) || 0;
  const T = Number(targetPercent) || 75;

  if (C <= 0) {
    return { classesCanMiss: 0, hoursCanMiss: 0, isSafe: true, message: 'No hours conducted yet.' };
  }

  const currentPct = (A / C) * 100;
  if (currentPct < T) {
    return {
      classesCanMiss: 0,
      hoursCanMiss: 0,
      isSafe: false,
      message: 'Attendance is currently below target. You cannot afford to miss any hours.'
    };
  }

  if (T <= 0) {
    return { classesCanMiss: 0, hoursCanMiss: 0, isSafe: true, message: 'Target is 0%.' };
  }

  const numerator = (100 * A) - (T * C);
  const canMiss = Math.floor(numerator / T);
  const safeMiss = Math.max(0, isFinite(canMiss) ? canMiss : 0);

  return {
    classesCanMiss: safeMiss,
    hoursCanMiss: safeMiss,
    isSafe: true,
    message: `You can miss up to ${safeMiss} upcoming hour${safeMiss === 1 ? '' : 's'} and maintain at least ${T}%.`
  };
}
export const calculateClassesCanMiss = calculateHoursCanMiss;

/**
 * What-If Attendance Simulator (Hour-based)
 * Pure simulation logic; never affects database.
 * @param {number} currentAttended 
 * @param {number} currentConducted 
 * @param {number} futureAttended 
 * @param {number} futureMissed 
 * @param {number} targetPercent 
 * @returns {Object}
 */
export function simulateAttendance(currentAttended, currentConducted, futureAttended, futureMissed, targetPercent = 75) {
  const cAtt = Number(currentAttended) || 0;
  const cCond = Number(currentConducted) || 0;
  const fAtt = Number(futureAttended) || 0;
  const fMiss = Number(futureMissed) || 0;

  const simAttended = cAtt + fAtt;
  const simConducted = cCond + fAtt + fMiss;
  const simPct = calculateSubjectAttendance(simAttended, simConducted);
  const statusInfo = getAttendanceStatus(simPct, targetPercent);

  const initialPct = calculateSubjectAttendance(cAtt, cCond);
  const diff = Number((simPct - initialPct).toFixed(2));

  return {
    simAttended,
    simConducted,
    simPct,
    diff,
    status: statusInfo.status,
    isSafe: statusInfo.isSafe,
    isNearTarget: statusInfo.isNearTarget,
    isShortage: statusInfo.isShortage,
    badgeClass: statusInfo.badgeClass
  };
}
export const simulateHourAttendance = simulateAttendance;

/**
 * Calculate attendance streaks from records
 * @param {Array} attendanceRecords 
 * @returns {{currentStreak: number, longestStreak: number}}
 */
export function calculateStreaks(attendanceRecords) {
  if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort chronologically by date and id
  const sorted = [...attendanceRecords].sort((a, b) => {
    const dComp = new Date(a.date) - new Date(b.date);
    return dComp !== 0 ? dComp : (a.id - b.id);
  });

  let longest = 0;
  let tempStreak = 0;

  for (const record of sorted) {
    if (record.status === 'Present') {
      tempStreak += 1;
      if (tempStreak > longest) {
        longest = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Current streak is consecutive "Present" backwards from the most recent record
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].status === 'Present') {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longest, currentStreak)
  };
}

/**
 * Format ISO or YYYY-MM-DD date to a human readable format
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Show a toast notification on the UI
 * @param {string} message 
 * @param {'success'|'error'|'warning'|'info'} type 
 * @param {number} duration 
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Initialize global error listener for API exceptions
 */
export function initGlobalErrorListener() {
  if (typeof window !== 'undefined') {
    window.addEventListener('app:api-error', (event) => {
      const { message } = event.detail || {};
      showToast(message || 'An API error occurred.', 'error', 4500);
    });
  }
}

// Auto initialize on load
if (typeof window !== 'undefined') {
  initGlobalErrorListener();
}
