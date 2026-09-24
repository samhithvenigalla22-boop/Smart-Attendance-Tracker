/**
 * validationException.js
 * Centralized Form & Calculation Validation
 * Adheres strictly to exception/ folder rules in PDF specification
 */

export class ValidationException extends Error {
  /**
   * @param {string} message - General validation summary message
   * @param {Object.<string, string>} fieldErrors - Map of field names to error messages
   */
  constructor(message = 'Validation failed', fieldErrors = {}) {
    super(message);
    this.name = 'ValidationException';
    this.fieldErrors = fieldErrors;
    this.timestamp = new Date().toISOString();
  }

  hasErrors() {
    return Object.keys(this.fieldErrors).length > 0;
  }

  getErrorList() {
    return Object.values(this.fieldErrors);
  }
}

/**
 * Validates student data
 * @param {Object} student 
 * @param {Array} [existingStudents=[]] - List of existing students for duplicate check
 * @param {string|number|null} [currentStudentId=null] - ID of current student if editing
 * @returns {ValidationException|null} Returns exception if invalid, null if valid
 */
export function validateStudent(student, existingStudents = [], currentStudentId = null) {
  const errors = {};

  if (!student.name || !student.name.trim()) {
    errors.name = 'Student name is required.';
  } else if (student.name.trim().length < 2) {
    errors.name = 'Student name must be at least 2 characters long.';
  }

  if (!student.rollNumber || !student.rollNumber.trim()) {
    errors.rollNumber = 'Roll number is required.';
  }

  if (!student.email || !student.email.trim()) {
    errors.email = 'Email address is required.';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(student.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  // Duplicate checks against existing students
  if (Array.isArray(existingStudents) && existingStudents.length > 0) {
    const currentIdStr = currentStudentId !== null && currentStudentId !== undefined ? String(currentStudentId).trim() : null;
    const otherStudents = existingStudents.filter((s) => {
      if (currentIdStr === null) return true;
      return String(s.id).trim() !== currentIdStr;
    });

    // Check duplicate email (case-insensitive, trimmed)
    if (student.email && student.email.trim() && !errors.email) {
      const normalizedEmail = student.email.trim().toLowerCase();
      const emailExists = otherStudents.some((s) => s.email && s.email.trim().toLowerCase() === normalizedEmail);
      if (emailExists) {
        errors.email = 'Email already exists. Please use a different email.';
      }
    }

    // Check duplicate registration/roll number (trimmed, case-insensitive)
    if (student.rollNumber && student.rollNumber.trim() && !errors.rollNumber) {
      const normalizedRoll = student.rollNumber.trim().toLowerCase();
      const rollExists = otherStudents.some((s) => s.rollNumber && s.rollNumber.trim().toLowerCase() === normalizedRoll);
      if (rollExists) {
        errors.rollNumber = 'Registration number already exists. Please use a different registration number.';
      }
    }
  }

  if (student.course && !student.course.trim()) {
    errors.course = 'Course cannot be empty.';
  }

  if (student.semester) {
    const sem = Number(student.semester);
    if (isNaN(sem) || sem < 1 || sem > 12) {
      errors.semester = 'Semester must be a valid number between 1 and 12.';
    }
  }

  if (Object.keys(errors).length > 0) {
    let summaryMsg = 'Student validation failed. Please check the form fields.';
    if (errors.email && errors.rollNumber && errors.email.includes('already exists') && errors.rollNumber.includes('already exists')) {
      summaryMsg = 'Email and registration number already exist. Please use unique values.';
    } else if (errors.email && errors.email.includes('already exists')) {
      summaryMsg = errors.email;
    } else if (errors.rollNumber && errors.rollNumber.includes('already exists')) {
      summaryMsg = errors.rollNumber;
    }
    return new ValidationException(summaryMsg, errors);
  }

  return null;
}

/**
 * Validates subject data
 * @param {Object} subject 
 * @returns {ValidationException|null}
 */
export function validateSubject(subject) {
  const errors = {};

  if (!subject.subjectName || !subject.subjectName.trim()) {
    errors.subjectName = 'Subject name is required.';
  }

  if (!subject.subjectCode || !subject.subjectCode.trim()) {
    errors.subjectCode = 'Subject code is required (e.g., CS301).';
  }

  const target = Number(subject.targetAttendance);
  if (isNaN(target) || target < 1 || target > 100) {
    errors.targetAttendance = 'Target attendance must be between 1% and 100%.';
  }

  if (subject.credits !== undefined && subject.credits !== '') {
    const credits = Number(subject.credits);
    if (isNaN(credits) || credits < 0 || credits > 10) {
      errors.credits = 'Credits must be a number between 0 and 10.';
    }
  }

  if (subject.classesPerWeek !== undefined && subject.classesPerWeek !== '') {
    const cpw = Number(subject.classesPerWeek);
    if (isNaN(cpw) || cpw < 1 || cpw > 20) {
      errors.classesPerWeek = 'Classes per week must be between 1 and 20.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationException('Subject validation failed. Please correct the highlighted fields.', errors);
  }

  return null;
}

/**
 * Validates an attendance record (Aggregate hours)
 * @param {Object} record { studentId, subjectId, conductedHours, attendedHours }
 * @returns {ValidationException|null}
 */
export function validateAttendance(record) {
  const errors = {};

  if (!record.subjectId) {
    errors.subjectId = 'A valid subject must be selected.';
  }

  if (record.conductedHours === undefined || record.conductedHours === null || record.conductedHours === '') {
    errors.conductedHours = 'Conducted hours is required.';
  } else {
    const cond = Number(record.conductedHours);
    if (isNaN(cond) || !Number.isInteger(cond) || cond < 0) {
      errors.conductedHours = 'Conducted hours must be a non-negative whole number.';
    }
  }

  if (record.attendedHours === undefined || record.attendedHours === null || record.attendedHours === '') {
    errors.attendedHours = 'Attended hours is required.';
  } else {
    const att = Number(record.attendedHours);
    if (isNaN(att) || !Number.isInteger(att) || att < 0) {
      errors.attendedHours = 'Attended hours must be a non-negative whole number.';
    }
  }

  const cond = Number(record.conductedHours);
  const att = Number(record.attendedHours);

  if (!isNaN(cond) && !isNaN(att) && att > cond) {
    errors.attendedHours = 'Attended hours cannot be greater than conducted hours.';
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationException('Attendance hours validation failed.', errors);
  }

  return null;
}

/**
 * Validates attendance calculation inputs (Hours)
 * @param {number} attended 
 * @param {number} conducted 
 * @param {number} [target]
 * @returns {ValidationException|null}
 */
export function validateAttendanceStats(attended, conducted, target = 75) {
  const errors = {};

  if (isNaN(attended) || attended < 0) {
    errors.attended = 'Attended hours cannot be negative.';
  }

  if (isNaN(conducted) || conducted < 0) {
    errors.conducted = 'Conducted hours cannot be negative.';
  }

  if (attended > conducted) {
    errors.attended = 'Attended hours cannot exceed total conducted hours.';
  }

  if (target !== undefined) {
    if (isNaN(target) || target < 1 || target > 100) {
      errors.target = 'Target attendance must be between 1% and 100%.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationException('Attendance numbers validation failed.', errors);
  }

  return null;
}


/**
 * Validates timetable entries
 * @param {Object} entry 
 * @returns {ValidationException|null}
 */
export function validateTimetable(entry) {
  const errors = {};

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (!entry.day || !validDays.includes(entry.day)) {
    errors.day = 'A valid day of the week is required.';
  }

  if (!entry.startTime || !entry.startTime.trim()) {
    errors.startTime = 'Start time is required.';
  }

  if (!entry.endTime || !entry.endTime.trim()) {
    errors.endTime = 'End time is required.';
  }

  if (entry.startTime && entry.endTime && entry.startTime >= entry.endTime) {
    errors.endTime = 'End time must be after start time.';
  }

  if (!entry.subjectId) {
    errors.subjectId = 'Subject selection is required.';
  }

  if (!entry.room || !entry.room.trim()) {
    errors.room = 'Room / Hall is required (e.g. LH-101).';
  }

  if (Object.keys(errors).length > 0) {
    return new ValidationException('Timetable validation failed.', errors);
  }

  return null;
}

/**
 * Validates planner and simulator inputs
 * @param {number} attended 
 * @param {number} conducted 
 * @param {number} target 
 * @returns {ValidationException|null}
 */
export function validatePlannerInputs(attended, conducted, target) {
  return validateAttendanceStats(attended, conducted, target);
}
