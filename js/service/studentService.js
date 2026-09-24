/**
 * studentService.js
 * API Service for Student Entity (CRUD operations)
 * Communicates strictly via Axios to JSON Server /students
 * NO DOM manipulation allowed here.
 */

import { apiClient } from './apiConfig.js';
import { handleApiError } from '../../exception/apiException.js';

const ENDPOINT = '/students';

export const studentService = {
  /**
   * Fetch all students
   * @returns {Promise<Array>} List of students
   */
  async getAllStudents() {
    try {
      const response = await apiClient.get(ENDPOINT);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'fetch all students');
    }
  },

  /**
   * Fetch student by ID
   * @param {string|number} id 
   * @returns {Promise<Object>} Student details
   */
  async getStudentById(id) {
    try {
      const response = await apiClient.get(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `fetch student #${id}`);
    }
  },

  /**
   * Create new student
   * @param {Object} studentData 
   * @returns {Promise<Object>} Created student
   */
  async createStudent(studentData) {
    try {
      const response = await apiClient.post(ENDPOINT, studentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error, ENDPOINT, 'create student');
    }
  },

  /**
   * Update student by ID
   * @param {string|number} id 
   * @param {Object} studentData 
   * @returns {Promise<Object>} Updated student
   */
  async updateStudent(id, studentData) {
    try {
      const response = await apiClient.put(`${ENDPOINT}/${id}`, studentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `update student #${id}`);
    }
  },

  /**
   * Delete student by ID
   * @param {string|number} id 
   * @returns {Promise<void>}
   */
  async deleteStudent(id) {
    try {
      const response = await apiClient.delete(`${ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `${ENDPOINT}/${id}`, `delete student #${id}`);
    }
  }
};
