/**
 * subjectService.js
 * API Service for Subject Entity (CRUD operations)
 * Communicates strictly via Axios to JSON Server /subjects
 * NO DOM manipulation allowed here.
 */

import { apiClient } from './apiConfig.js';
import { handleApiError } from '../../exception/apiException.js';

const ENDPOINT = '/subjects';

export const subjectService = {
  /**
   * Fetch all subjects
   * @returns {Promise<Array>} List of subjects
   */
  async getAllSubjects() {
    try {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'fetch all subjects');
    }
  },

  /**
   * Fetch subjects associated with a specific student
   * @param {string|number} studentId 
   * @returns {Promise<Array>} Subjects for this student
   */
  async getSubjectsByStudent(studentId) {
    try {
      const response = await apiClient.get(`${ENDPOINT}?studentId=${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}?studentId=${studentId}`, `fetch subjects for student #${studentId}`);
    }
  },

  /**
   * Fetch a single subject by ID
   * @param {string|number} id 
   * @returns {Promise<Object>} Subject details
   */
  async getSubjectById(id) {
    try {
      const response = await apiClient.get(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `fetch subject #${id}`);
    }
  },

  /**
   * Create new subject
   * @param {Object} subjectData 
   * @returns {Promise<Object>} Created subject
   */
  async createSubject(subjectData) {
    try {
      const response = await apiClient.post(ENDPOINT, subjectData);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'create subject');
    }
  },

  /**
   * Update subject by ID
   * @param {string|number} id 
   * @param {Object} subjectData 
   * @returns {Promise<Object>} Updated subject
   */
  async updateSubject(id, subjectData) {
    try {
      const response = await apiClient.put(`${ENDPOINT}/${id}`, subjectData);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `update subject #${id}`);
    }
  },

  /**
   * Delete subject by ID
   * @param {string|number} id 
   * @returns {Promise<void>}
   */
  async deleteSubject(id) {
    try {
      const response = await apiClient.delete(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `delete subject #${id}`);
    }
  }
};
