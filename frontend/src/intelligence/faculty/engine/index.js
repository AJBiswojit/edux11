/**
 * Faculty Intelligence Engine — barrel export.
 * Future faculty modules import scoring + analytics from '@/intelligence/faculty'.
 */

export {
  clamp, round1, avg, weighted,
  computeTeachingHealth, computeTeachingEffectiveness, computeStudentEngagement,
  computeTeachingProductivity, computePerformanceTrend, computeAssessmentReadiness,
} from './scores.js'

export {
  computeCourseProgress, computeAssessmentCoverage, computeAssignmentCompletion,
  computeEvaluationProgress, detectWeakChapters, computeRevisionPriority, computeCohorts,
} from './analytics.js'

export {
  evaluateTeachingAlerts, generateTeachingRecommendations,
  buildTeachingSummary, buildAssessmentSummary,
} from './alerts.js'

export { computeAttendanceIntelligence, computePendingAttendance } from './attendance.js'
export { computeAssignmentAnalytics } from './assignments.js'
export { computeEngagementAnalytics } from './engagement.js'
export { computeTeachingInsights, computeTopicDifficulty } from './insights.js'
export { computeAttentionStudents } from './attention.js'
export { buildTeachingTimeline } from './timeline.js'
export {
  computeAssessmentIntelligence, computeQuestionStats, computeCoverageAnalytics,
  computeAssessmentHealth, computePaperLibrary, computeUpcomingAssessments,
  computeAssessmentTimeline, computeAssessmentRecommendations, computePyqIntelligence,
  computeCompetitiveQuestionIntelligence, withLiveQuestionStats,
} from './assessment.js'
export { computeReportIntelligence, buildReportPreview } from './reports.js'
export { computeStudentIntelligence } from './students.js'
export { computeDashboardIntelligence } from './dashboard.js'
export { computeAiStudioIntelligence, generateLessonPlan, generateStudioContent, generateEvaluation } from './ai-studio.js'
export {
  deriveStudentStatus, computeMyStudentsDirectory, computeBatchDetail,
  computeStudentProfileBundle, computeStudentExamHistory, computeAttemptAnalysis,
} from './students-directory.js'
export {
  computeStudent360, computeStudentOverview, buildStudentAiSummary,
  computeStudentStrengthsWeaknesses, computeStudentSubjectIntelligence,
  computeStudentChapterIntelligence, computeStudentQuestionIntelligence,
  computeStudentLongitudinal, computeStudentExamComparison,
} from './student-360.js'
export {
  computeStudentIssueFingerprints, classifyIssueType, deriveIssueSeverity,
  similarityBetween, groupSimilarIssues, buildIndividualIssue, buildIndividualWhyDetected,
  buildRecommendation, derivePriority, computeInterventions, SIMILARITY_WEIGHTS,
} from './similar-issues.js'
export {
  INTERVENTION_STATUSES, TRANSITIONS, canTransition, practiceTypeFor,
  objectivesFor, buildInterventionFromGroup, selectPracticeQuestions,
  buildRetestEntity, sameInterventionTarget, metricsFromCanonicalAttempt,
  matchInterventionExamAttempts, computeEffectiveness, computeGroupEffectiveness,
} from './intervention-lifecycle.js'

export {
  aggregateTopicIntelligence, aggregateConceptIntelligence,
  computeSubjectDiagnostics, computeChapterDrilldown,
  resolveEvidenceQuestions, generateAiObservation,
  generateWhyFlagged, generateInterventionRecommendation,
  computeGroundLevelIntelligence,
} from './ground-level-intelligence.js'

export {
  analyzeSource, suitablePatternsFor, recommendDistribution, generateQuestions,
  regenerateQuestion, qualityScore, difficultyDistribution, computeStudioMetrics,
  syncStudioQuestionsToBank,
} from './question-studio.js'
export {
  MICRO_ASSESSMENT_COUNTS, MICRO_ASSESSMENT_DIFFICULTIES,
  normalizeMicroDomain, normalizeExamFamily, sameMicroContext,
  sourceContextLabel, validateMicroSourceInput, buildMicroSource,
  findMicroSource, filterMicroSources, processMicroSource,
  generateMicroQuestions, regenerateMicroQuestion, computeQuestionDiversity,
  computeConceptCoverage, validateGeneratedQuestion, generateMissingCoverage,
  buildPrototypeMicroAttempts, computeMicroAssessmentResults, studentAttemptStatus,
  sourceFilterOptions, QUESTION_TYPES,
} from './micro-assessments.js'
