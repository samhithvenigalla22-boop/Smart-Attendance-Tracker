/**
 * timetableService.js
 * API Service for Timetable Entity (CRUD operations)
 * Communicates strictly via Axios to JSON Server /timetable
 * NO DOM manipulation allowed here.
 */

import { apiClient } from './apiConfig.js';
import { handleApiError } from '../../exception/apiException.js';

const ENDPOINT = '/timetable';

export const timetableService = {
  /**
   * Fetch all timetable entries
   * @returns {Promise<Array>}
   */
  async getAllTimetable() {
    try {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'fetch all timetable entries');
    }
  },

  /**
   * Fetch timetable entries for a specific student
   * @param {string|number} studentId 
   * @returns {Promise<Array>}
   */
  async getTimetableByStudent(studentId) {
    try {
      const response = await apiClient.get(`${ENDPOINT}?studentId=${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}?studentId=${studentId}`, `fetch timetable for student #${studentId}`);
    }
  },

  /**
   * Fetch timetable entry by ID
   * @param {string|number} id 
   * @returns {Promise<Object>}
   */
  async getTimetableById(id) {
    try {
      const response = await apiClient.get(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `fetch timetable entry #${id}`);
    }
  },

  /**
   * Create new timetable entry
   * @param {Object} entry 
   * @returns {Promise<Object>}
   */
  async createTimetable(entry) {
    try {
      const response = await apiClient.post(ENDPOINT, entry);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'create timetable entry');
    }
  },

  /**
   * Update timetable entry
   * @param {string|number} id 
   * @param {Object} entry 
   * @returns {Promise<Object>}
   */
  async updateTimetable(id, entry) {
    try {
      const response = await apiClient.put(`${ENDPOINT}/${id}`, entry);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `update timetable entry #${id}`);
    }
  },

  /**
   * Delete timetable entry
   * @param {string|number} id 
   * @returns {Promise<void>}
   */
  async deleteTimetable(id) {
    try {
      const response = await apiClient.delete(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `delete timetable entry #${id}`);
    }
  }
};
