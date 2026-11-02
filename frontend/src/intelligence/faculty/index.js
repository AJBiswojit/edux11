/**
 * MediXO EduX — Faculty Academic Intelligence Foundation (public API).
 *
 * One centralized, interconnected intelligence layer for the Faculty module.
 *  - masterFacultyProfile   → single source of truth for faculty identity
 *  - facultyDatasets        → every faculty dataset (the existing deterministic datasets
 *                             re-exported + new datasets) — no isolated copies
 *  - engine                 → deterministic mock-AI derivation functions
 *  - computeFacultyIntelligence() → fully assembled snapshot
 *
 * Future modules (Teaching Intelligence, Assessment Intelligence, AI
 * Teaching Assistant, Reports, Student Analytics) import from
 * '@/intelligence/faculty' — they never maintain isolated faculty data.
 * UI-free; relative imports so it runs in plain Node and the browser.
 */

import { masterFacultyProfile, facultyProfileView } from './master-profile.js'
import { facultyDatasets } from './datasets/index.js'
import {
  computeTeachingHealth, computeTeachingEffectiveness, computeStudentEngagement,
  computeTeachingProductivity, computePerformanceTrend, computeAssessmentReadiness,
  computeCourseProgress, computeAssessmentCoverage, computeAssignmentCompletion,
  computeEvaluationProgress, detectWeakChapters, computeRevisionPriority, computeCohorts,
  evaluateTeachingAlerts, generateTeachingRecommendations,
  buildTeachingSummary, buildAssessmentSummary,
  computeAttendanceIntelligence, computeAssignmentAnalytics, computeEngagementAnalytics,
  computeTeachingInsights, computeAttentionStudents, buildTeachingTimeline,
  computeAssessmentIntelligence, computePyqIntelligence, computeCompetitiveQuestionIntelligence,
  withLiveQuestionStats,
  computeReportIntelligence, buildReportPreview, computeStudentIntelligence, computeDashboardIntelligence,
  computeAiStudioIntelligence, generateLessonPlan, generateStudioContent, generateEvaluation,
  deriveStudentStatus, computeMyStudentsDirectory, computeBatchDetail,
  computeStudentProfileBundle, computeStudentExamHistory, computeAttemptAnalysis,
  computeStudent360, computeStudentOverview, buildStudentAiSummary,
  computeStudentStrengthsWeaknesses, computeStudentSubjectIntelligence,
  computeStudentChapterIntelligence, computeStudentQuestionIntelligence,
  computeStudentLongitudinal, computeStudentExamComparison,
  computeStudentIssueFingerprints, classifyIssueType, deriveIssueSeverity,
  similarityBetween, groupSimilarIssues, buildIndividualIssue, buildIndividualWhyDetected,
  buildRecommendation, derivePriority, computeInterventions, SIMILARITY_WEIGHTS,
  INTERVENTION_STATUSES, TRANSITIONS, canTransition, practiceTypeFor,
  objectivesFor, buildInterventionFromGroup, selectPracticeQuestions,
  buildRetestEntity, sameInterventionTarget, metricsFromCanonicalAttempt,
  matchInterventionExamAttempts, computeEffectiveness, computeGroupEffectiveness,
  analyzeSource, suitablePatternsFor, recommendDistribution, generateQuestions,
  regenerateQuestion, qualityScore, difficultyDistribution, computeStudioMetrics,
  syncStudioQuestionsToBank,
  MICRO_ASSESSMENT_COUNTS, MICRO_ASSESSMENT_DIFFICULTIES,
  normalizeMicroDomain, normalizeExamFamily, sameMicroContext,
  sourceContextLabel, validateMicroSourceInput, buildMicroSource,
  findMicroSource, filterMicroSources, processMicroSource,
  generateMicroQuestions, regenerateMicroQuestion, computeQuestionDiversity,
  computeConceptCoverage, validateGeneratedQuestion, generateMissingCoverage,
  buildPrototypeMicroAttempts, computeMicroAssessmentResults, studentAttemptStatus,
  sourceFilterOptions, QUESTION_TYPES,
} from './engine/index.js'

export {
  masterFacultyProfile, facultyProfileView,
  facultyDatasets,
  computeTeachingHealth, computeTeachingEffectiveness, computeStudentEngagement,
  computeTeachingProductivity, computePerformanceTrend, computeAssessmentReadiness,
  computeCourseProgress, computeAssessmentCoverage, computeAssignmentCompletion,
  computeEvaluationProgress, detectWeakChapters, computeRevisionPriority, computeCohorts,
  evaluateTeachingAlerts, generateTeachingRecommendations,
  buildTeachingSummary, buildAssessmentSummary,
  computeAttendanceIntelligence, computeAssignmentAnalytics, computeEngagementAnalytics,
  computeTeachingInsights, computeAttentionStudents, buildTeachingTimeline,
  computeAssessmentIntelligence, computePyqIntelligence, withLiveQuestionStats,
  computeReportIntelligence, buildReportPreview, computeStudentIntelligence, computeDashboardIntelligence,
  computeAiStudioIntelligence, generateLessonPlan, generateStudioContent, generateEvaluation,
  deriveStudentStatus, computeMyStudentsDirectory, computeBatchDetail,
  computeStudentProfileBundle, computeStudentExamHistory, computeAttemptAnalysis,
  computeStudent360, computeStudentOverview, buildStudentAiSummary,
  computeStudentStrengthsWeaknesses, computeStudentSubjectIntelligence,
  computeStudentChapterIntelligence, computeStudentQuestionIntelligence,
  computeStudentLongitudinal, computeStudentExamComparison,
  computeStudentIssueFingerprints, classifyIssueType, deriveIssueSeverity,
  similarityBetween, groupSimilarIssues, buildIndividualIssue, buildIndividualWhyDetected,
  buildRecommendation, derivePriority, computeInterventions, SIMILARITY_WEIGHTS,
  INTERVENTION_STATUSES, TRANSITIONS, canTransition, practiceTypeFor,
  objectivesFor, buildInterventionFromGroup, selectPracticeQuestions,
  buildRetestEntity, sameInterventionTarget, metricsFromCanonicalAttempt,
  matchInterventionExamAttempts, computeEffectiveness, computeGroupEffectiveness,
  analyzeSource, suitablePatternsFor, recommendDistribution, generateQuestions,
  regenerateQuestion, qualityScore, difficultyDistribution, computeStudioMetrics,
  syncStudioQuestionsToBank,
  MICRO_ASSESSMENT_COUNTS, MICRO_ASSESSMENT_DIFFICULTIES,
  normalizeMicroDomain, normalizeExamFamily, sameMicroContext,
  sourceContextLabel, validateMicroSourceInput, buildMicroSource,
  findMicroSource, filterMicroSources, processMicroSource,
  generateMicroQuestions, regenerateMicroQuestion, computeQuestionDiversity,
  computeConceptCoverage, validateGeneratedQuestion, generateMissingCoverage,
  buildPrototypeMicroAttempts, computeMicroAssessmentResults, studentAttemptStatus,
  sourceFilterOptions, QUESTION_TYPES,
}

/* ---------- Derived intelligence — recomputed on every call ----------

   Phase 11: the snapshot is now backend-fed. The datasets are injected as a
   parameter (the service/API layer supplies them), so this engine never
   default-imports backend-owned seed data at runtime. */
export function computeFacultyIntelligence(datasets = {}) {
  const ds = datasets

  /* analytics */
  const courseProgress = computeCourseProgress({ courses: ds.courses, attendance: ds.attendance })
  const assignmentCompletion = computeAssignmentCompletion({ assignments: ds.assignments })
  const evaluationProgress = computeEvaluationProgress({ assignments: ds.assignments, dashboard: ds.facultyDashboard })
  const weakChapters = detectWeakChapters({ studentAnalytics: ds.studentAnalytics, pyqAnalysis: ds.pyqAnalysis })
  const revisionPriority = computeRevisionPriority({ pyqPatterns: ds.pyqPatterns, weakChapters })
  const assessmentCoverage = computeAssessmentCoverage({ examBuilder: ds.examBuilder, paperGenerator: ds.paperGenerator })
  const cohorts = computeCohorts({ sections: ds.sections, studentAnalytics: ds.studentAnalytics, weakStudentDetection: ds.weakStudentDetection })

  /* scores */
  const teachingHealth = computeTeachingHealth({
    attendance: ds.attendance, courses: ds.courses, assignments: ds.assignments,
    engagement: ds.engagement, evaluationProgress,
  })
  const effectiveness = computeTeachingEffectiveness({ courses: ds.courses, quizBuilder: ds.quizBuilder })
  const engagement = computeStudentEngagement({ engagement: ds.engagement })
  const productivity = computeTeachingProductivity({ dashboard: ds.facultyDashboard, weeklyTeachingHours: ds.weeklyTeachingHours })
  const performanceTrend = computePerformanceTrend({ dashboard: ds.facultyDashboard, attendance: ds.attendance })
  const assessmentReadiness = computeAssessmentReadiness({ examBuilder: ds.examBuilder, paperGenerator: ds.paperGenerator, quizBuilder: ds.quizBuilder })

  /* alerts + recommendations */
  const alerts = evaluateTeachingAlerts({
    attendance: ds.attendance, evaluationProgress, weakStudentDetection: ds.weakStudentDetection,
    examBuilder: ds.examBuilder, quizBuilder: ds.quizBuilder, engagement: ds.engagement,
  })
  const recommendations = generateTeachingRecommendations({ pool: ds.recommendationsPool, teachingHealth, alerts })

  /* teaching intelligence workspace */
  const attendanceIntelligence = computeAttendanceIntelligence({ attendance: ds.attendance, teachingSchedule: ds.teachingSchedule })
  const attentionStudents = computeAttentionStudents({ weakStudentDetection: ds.weakStudentDetection })
  const assignmentAnalytics = computeAssignmentAnalytics({
    assignments: ds.assignments, studentAnalytics: ds.studentAnalytics, attentionStudents,
  })
  const engagementAnalytics = computeEngagementAnalytics({ engagementScores: ds.engagementScores, engagementInputs: ds.engagement })
  const teachingInsights = computeTeachingInsights({
    studentAnalytics: ds.studentAnalytics, pyqPatterns: ds.pyqPatterns, weakChapters, revisionPriority,
    questionBank: ds.questionBank, resources: ds.resources, courses: ds.courses, attentionStudents,
  })
  const teachingTimeline = buildTeachingTimeline({
    lecturePlanner: ds.lecturePlanner, attendance: ds.attendance, assignments: ds.assignments,
    announcements: ds.announcements, paperGenerator: ds.paperGenerator, quizBuilder: ds.quizBuilder,
    examBuilder: ds.examBuilder, revisionSessions: ds.revisionSessions,
  })

  /* assessment intelligence workspace */
  const assessment = computeAssessmentIntelligence({
    questionBank: ds.questionBank, paperGenerator: ds.paperGenerator,
    examBuilder: ds.examBuilder, quizBuilder: ds.quizBuilder, pyqAnalysis: ds.pyqAnalysis,
    questionCoverage: ds.questionCoverage, assessmentHealthInputs: ds.assessmentHealthInputs,
    readinessScore: assessmentReadiness.score,
  })
  const pyqIntelligence = computePyqIntelligence({
    pyqTrends: ds.pyqTrends, pyqAnalysis: ds.pyqAnalysis, questionCoverage: ds.questionCoverage,
  })

  /* Phase 29 — competitive question intelligence (one source: the dataset) */
  const competitiveQuestionIntelligence = computeCompetitiveQuestionIntelligence({
    competitiveQuestions: ds.competitiveQuestions ?? [],
    universityPyqQuestions: ds.universityPyqQuestions ?? [],
  })

  /* reports intelligence */
  const reports = computeReportIntelligence({
    reports: ds.reports, reportTemplates: ds.reportTemplates, exportHistory: ds.exportHistory,
    reportSchedule: ds.reportSchedule,
    teachingHealth, teachingEffectiveness: effectiveness, performanceTrend,
    assessmentHealth: assessment.assessmentHealth,
    engagementAnalytics, attentionStudents, cohorts,
    questionStats: assessment.questionStats,
    paperLibrary: assessment.paperLibrary, pyqAnalysis: ds.pyqAnalysis,
    attendanceIntelligence, research: ds.research,
  })

  /* students intelligence */
  const students = computeStudentIntelligence({
    cohorts, attentionStudents, engagementAnalytics, attendanceIntelligence,
    assignmentAnalytics, teachingInsights, studentAnalytics: ds.studentAnalytics,
    weakStudentDetection: ds.weakStudentDetection,
  })



  /* dashboard command center — consumes every derived key above */
  const derivedSnapshot = {
    teachingHealth, teachingEffectiveness: effectiveness, studentEngagement: engagement,
    teachingProductivity: productivity, performanceTrend, assessmentReadiness, courseProgress,
    assessmentCoverage, assignmentCompletion, evaluationProgress, weakChapters, revisionPriority,
    cohorts, alerts, recommendations, attendanceIntelligence, assignmentAnalytics,
    engagementAnalytics, teachingInsights, attentionStudents, teachingTimeline,
    assessment, pyqIntelligence, reports, students,
  }
  const dashboard = computeDashboardIntelligence({ derived: derivedSnapshot, datasets: ds, profile: masterFacultyProfile })

  /* ai teaching studio */
  const aiStudio = computeAiStudioIntelligence({ derived: derivedSnapshot, datasets: ds, profile: masterFacultyProfile })

  const summary = buildTeachingSummary({
    teachingHealth, effectiveness, engagement, productivity, performanceTrend, cohorts, weakChapters,
  })
  const assessmentSummary = buildAssessmentSummary({
    assessmentSummaryInputs: ds.assessmentSummaryInputs, questionBank: ds.questionBank,
    paperGenerator: ds.paperGenerator, examBuilder: ds.examBuilder, quizBuilder: ds.quizBuilder,
    pyqAnalysis: ds.pyqAnalysis,
  })

  return {
    teachingHealth,
    teachingEffectiveness: effectiveness,
    studentEngagement: engagement,
    teachingProductivity: productivity,
    performanceTrend,
    assessmentReadiness,
    courseProgress,
    assessmentCoverage,
    assignmentCompletion,
    evaluationProgress,
    weakChapters,
    revisionPriority,
    cohorts,
    alerts,
    recommendations,
    attendanceIntelligence,
    assignmentAnalytics,
    engagementAnalytics,
    teachingInsights,
    attentionStudents,
    teachingTimeline,
    assessment,
    pyqIntelligence,
    competitiveQuestionIntelligence,
    reports,
    students,
    dashboard,
    aiStudio,
    summary,
    assessmentSummary,
    generatedAt: new Date().toISOString(),
  }
}

/** Fully assembled snapshot: profile + datasets + derived. */
export function getFacultyIntelligence(datasets = {}) {
  return {
    profile: masterFacultyProfile,
    datasets,
    derived: computeFacultyIntelligence(datasets),
  }
}

export default getFacultyIntelligence
