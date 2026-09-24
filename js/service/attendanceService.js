/**
 * attendanceService.js
 * API Service for Attendance Records (CRUD operations)
 * Communicates strictly via Axios to JSON Server /attendance
 * NO DOM manipulation allowed here.
 */

import { apiClient } from './apiConfig.js';
import { handleApiError } from '../../exception/apiException.js';

const ENDPOINT = '/attendance';

export const attendanceService = {
  /**
   * Fetch all attendance records
   * @returns {Promise<Array>}
   */
  async getAllAttendance() {
    try {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'fetch all attendance records');
    }
  },

  /**
   * Fetch attendance records for a specific student
   * @param {string|number} studentId 
   * @returns {Promise<Array>}
   */
  async getAttendanceByStudent(studentId) {
    try {
      const response = await apiClient.get(`${ENDPOINT}?studentId=${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}?studentId=${studentId}`, `fetch attendance for student #${studentId}`);
    }
  },

  /**
   * Fetch attendance records for a specific subject
   * @param {string|number} subjectId 
   * @returns {Promise<Array>}
   */
  async getAttendanceBySubject(subjectId) {
    try {
      const response = await apiClient.get(`${ENDPOINT}?subjectId=${subjectId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}?subjectId=${subjectId}`, `fetch attendance for subject #${subjectId}`);
    }
  },

  /**
   * Fetch a single attendance record by ID
   * @param {string|number} id 
   * @returns {Promise<Object>}
   */
  async getAttendanceById(id) {
    try {
      const response = await apiClient.get(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `fetch attendance record #${id}`);
    }
  },

  /**
   * Record new attendance entry (Present / Absent)
   * @param {Object} record { studentId, subjectId, date, status }
   * @returns {Promise<Object>} Created record
   */
  async createAttendance(record) {
    try {
      const response = await apiClient.post(ENDPOINT, record);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'record attendance');
    }
  },

  /**
   * Update attendance record (date, status, etc.)
   * @param {string|number} id 
   * @param {Object} record 
   * @returns {Promise<Object>}
   */
  async updateAttendance(id, record) {
    try {
      const response = await apiClient.put(`${ENDPOINT}/${id}`, record);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `update attendance record #${id}`);
    }
  },

  /**
   * Delete attendance record
   * @param {string|number} id 
   * @returns {Promise<void>}
   */
  async deleteAttendance(id) {
    try {
      const response = await apiClient.delete(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `delete attendance record #${id}`);
    }
  }
};
