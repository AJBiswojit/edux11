/**
 * Admin Intelligence — analytics input data (aggregation layer).
 *
 * Re-exports ALL existing raw analytics datasets plus the faculty
 * intelligence inputs the admin engine rolls up (cohort at-risk trend,
 * faculty health). INPUTS ONLY — the engine performs every calculation.
 *
 * Zero data loss: every dataset previously served by /admin/* continues to
 * exist; this file is the single aggregation point for the engine.
 */

import {
  adminAnalytics, adminPerformance, adminPlacements, adminResearch,
} from '@/datasets/admin/core.js'
import {
  adminRevenue, adminAttendanceAnalytics, adminAssignmentAnalytics,
  adminExamAnalytics, adminQuestionBank, adminScholarships, adminApiConfig,
} from '@/datasets/admin/operations.js'

/* Faculty intelligence inputs (institution-level roll-up sources). */
import { weakStudentDetection } from '@/datasets/faculty/teaching.js'
import { facultyDatasets } from '../../faculty/datasets/index.js'

export {
  adminAnalytics, adminPerformance, adminPlacements, adminResearch,
  adminRevenue, adminAttendanceAnalytics, adminAssignmentAnalytics,
  adminExamAnalytics, adminQuestionBank, adminScholarships, adminApiConfig,
  weakStudentDetection, facultyDatasets,
}

export default {
  adminAnalytics, adminPerformance, adminPlacements, adminResearch,
  adminRevenue, adminAttendanceAnalytics, adminAssignmentAnalytics,
  adminExamAnalytics, adminQuestionBank, adminScholarships, adminApiConfig,
  weakStudentDetection, facultyDatasets,
}
