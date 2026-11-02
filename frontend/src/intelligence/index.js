/**
 * MediXO EduX — Student Intelligence Foundation (public API).
 *
 * One centralized, interconnected data layer for the Student module.
 *  - masterStudentProfile      → single source of truth for student identity
 *  - datasets                  → every academic dataset (all cross-referenced)
 *  - engine                    → deterministic mock-AI derivation functions
 *  - studentIntelligence       → fully assembled snapshot (base + derived)
 *
 * PHASE 27.1 — dual academic architecture:
 *  The derived snapshot now exposes TWO context-specific intelligence
 *  strategies over ONE common foundation:
 *
 *    derived.university    → University engine  (semester/course/academic)
 *    derived.competitive   → Competitive engine (exam/paper/PYQ/mock)
 *    derived.readiness     → ONE readiness orchestration layer
 *                            (readiness.university · readiness.competitive ·
 *                             readiness.byExamFamily {JEE, NEET})
 *
 *  Context isolation is enforced in the engines: university calculations
 *  never consume percentile/negative-marking/PYQ signals and competitive
 *  calculations never consume CGPA/university attendance.
 *
 * This module is UI-free and uses only relative imports so it can run in
 * plain Node (for tests/scripts) as well as the browser bundle.
 */

import masterStudentProfile, { studentAcademicProfile } from './master-profile.js'

import {
  attendance, attendanceAnalytics, courses, subjects, assignments, projects, todaySchedule, courseModules,
} from './datasets/academics.js'
import {
  universityExams, competitiveExams, quizResults, examPerformance,
} from './datasets/examinations.js'
import {
  practiceSessions, learningBehaviour, studyStatistics,
} from './datasets/learning.js'
import {
  academicPerformance, recommendations, notifications, achievements,
} from './datasets/outcomes.js'
import {
  academicJourney, digitalPortfolio, careerProfile,
} from './datasets/career.js'
import {
  academicHealthInputs, academicDnaInputs, examReadinessInputs, interventionRules,
} from './datasets/signals.js'
import {
  chapterMastery, topicMastery, mistakeIntelligence, weeklyActionPlan,
  improvementPrediction, learningBehaviourDetailed, healthBreakdownInputs,
} from './datasets/dna.js'
import {
  aiConversations, suggestedQuestions, quickPrompts, resourceRecommendations,
  generatedNotes, downloads, completedRecommendations,
} from './datasets/workspace.js'
import { competitivePyqPerformance } from './datasets/competitive.js'
import { academicResources } from './datasets/resources.js'
import { events } from './datasets/events.js'

import {
  computeConsistencyScore,
  computeLearningBehaviourScore,
  computeConfidenceIndex,
  computeImprovementIndex,
} from './engine/scores.js'
import { buildExamIntelligence } from './engine/exams.js'
import { buildPortfolioCompletion } from './engine/derive.js'
import { buildReadinessIntelligence } from './engine/readiness.js'
import { buildProgressReport, computeOverallReportScore, REPORT_PERIODS } from './engine/progress-report.js'
import { buildUniversityIntelligence } from './engine/university.js'
import { buildCompetitiveIntelligence } from './engine/competitive.js'
import {
  SPEED_THRESHOLDS, EXAM_TYPE_LABELS, ATTEMPT_CLASSIFICATIONS, classifyAttempt,
  formatClock, formatPace, computeLiveExamStats, buildExamAgentReport,
  buildDemoSimulationPlan, demoTimeScale,
  buildCanonicalExamAttempt, buildCanonicalQuestionAttempts,
  normalizeExamAttempt, filterExamAttempts, classifyAttemptContext,
} from './engine/exam-agent.js'
import {
  buildAttemptSignals, buildExamEvidence, buildAttemptAnalysisVariant,
  classifyChapterTrend, chapterStatus,
} from './engine/exam-attempt-intelligence.js'
import {
  buildDnaExecutiveSummary, buildStrengthAnalysis, buildWeaknessAnalysis,
  buildHealthBreakdown, buildLearningBehaviourAnalysis, buildSubjectMasteryDetail,
  buildChapterMastery, buildTopicMastery, buildMistakeIntelligence,
  buildImprovementOpportunities, buildWeeklyActionPlan, buildImprovementPrediction,
} from './engine/dna.js'
import {
  computeAcademicHealth,
  computeStrengthWeakAreas,
  computeAcademicDna,
  computeExamReadiness,
  evaluateInterventions,
  generateRecommendations,
  computeCareerReadiness,
  computeAchievementProgress,
  buildAcademicJourney,
  buildDailyBrief,
  buildRecentActivities,
  buildUpcomingDeadlines,
} from './engine/derive.js'

/* ------------------------------------------------------------------ */
/* Base datasets (grouped)                                             */
/* ------------------------------------------------------------------ */
export const datasets = {
  attendance,
  attendanceAnalytics,
  todaySchedule,
  courses,
  subjects,
  assignments,
  projects,
  universityExams,
  competitiveExams,
  quizResults,
  examPerformance,
  practiceSessions,
  learningBehaviour,
  studyStatistics,
  academicPerformance,
  recommendations,
  notifications,
  achievements,
  academicJourney,
  digitalPortfolio,
  careerProfile,
  academicHealthInputs,
  academicDnaInputs,
  examReadinessInputs,
  interventionRules,
  chapterMastery,
  topicMastery,
  mistakeIntelligence,
  weeklyActionPlan,
  improvementPrediction,
  learningBehaviourDetailed,
  healthBreakdownInputs,
  aiConversations,
  suggestedQuestions,
  quickPrompts,
  resourceRecommendations,
  generatedNotes,
  downloads,
  completedRecommendations,
  competitivePyqPerformance,
  academicResources,
  events,
  courseModules,
}

export {
  masterStudentProfile,
  studentAcademicProfile,
  attendance,
  attendanceAnalytics,
  todaySchedule,
  courses,
  subjects,
  assignments,
  projects,
  universityExams,
  competitiveExams,
  quizResults,
  examPerformance,
  practiceSessions,
  learningBehaviour,
  studyStatistics,
  academicPerformance,
  recommendations,
  notifications,
  achievements,
  academicJourney,
  digitalPortfolio,
  careerProfile,
  academicHealthInputs,
  academicDnaInputs,
  examReadinessInputs,
  interventionRules,
  chapterMastery,
  topicMastery,
  mistakeIntelligence,
  weeklyActionPlan,
  improvementPrediction,
  learningBehaviourDetailed,
  healthBreakdownInputs,
  aiConversations,
  suggestedQuestions,
  quickPrompts,
  resourceRecommendations,
  generatedNotes,
  downloads,
  completedRecommendations,
  competitivePyqPerformance,
  academicResources,
  events,
  courseModules,
}

export {
  computeConsistencyScore,
  computeLearningBehaviourScore,
  computeConfidenceIndex,
  computeImprovementIndex,
  computeAcademicHealth,
  computeStrengthWeakAreas,
  computeAcademicDna,
  computeExamReadiness,
  evaluateInterventions,
  generateRecommendations,
  computeCareerReadiness,
  computeAchievementProgress,
  buildAcademicJourney,
  buildDailyBrief,
  buildRecentActivities,
  buildUpcomingDeadlines,
  buildExamIntelligence,
  buildPortfolioCompletion,
  buildReadinessIntelligence,
  buildUniversityIntelligence,
  buildCompetitiveIntelligence,
  buildProgressReport,
  computeOverallReportScore,
  REPORT_PERIODS,
  /* AI Exam Conducting Agent (Phase 34) */
  SPEED_THRESHOLDS,
  EXAM_TYPE_LABELS,
  ATTEMPT_CLASSIFICATIONS,
  classifyAttempt,
  formatClock,
  formatPace,
  computeLiveExamStats,
  buildExamAgentReport,
  buildDemoSimulationPlan,
  demoTimeScale,
  /* Canonical ExamAttempt contract (Phase 1) */
  buildCanonicalExamAttempt,
  buildCanonicalQuestionAttempts,
  normalizeExamAttempt,
  filterExamAttempts,
  classifyAttemptContext,
  /* Exam-attempt intelligence adapter (Phase 2) */
  buildAttemptSignals,
  buildExamEvidence,
  buildAttemptAnalysisVariant,
  classifyChapterTrend,
  chapterStatus,
  buildDnaExecutiveSummary,
  buildStrengthAnalysis,
  buildWeaknessAnalysis,
  buildHealthBreakdown,
  buildLearningBehaviourAnalysis,
  buildSubjectMasteryDetail,
  buildChapterMastery,
  buildTopicMastery,
  buildMistakeIntelligence,
  buildImprovementOpportunities,
  buildWeeklyActionPlan,
  buildImprovementPrediction,
}

/* ------------------------------------------------------------------ */
/* Recommendation context tagging (Phase 27.1)                         */
/* University vs competitive — deterministic from subject codes + text. */
/* ------------------------------------------------------------------ */
function tagRecommendationContext(r) {
  const hay = `${r.topic ?? ''} ${r.reason ?? ''} ${r.source ?? ''}`
  if (r.subjectCode && /^CS/i.test(r.subjectCode)) return 'university'
  if (/JEE|NEET|mock|PYQ|Mechanics|optics|Chemistry|Physics|Mathematics|FLT/i.test(hay)) return 'competitive'
  return 'university'
}

/* ------------------------------------------------------------------ */
/* Derived intelligence — recomputed on every call (synchronization).  */
/* Changing any base dataset immediately changes every derived value.  */
/* ------------------------------------------------------------------ */
export function computeDerivedIntelligence(extra = {}) {
  const consistencyScore = computeConsistencyScore({ attendanceAnalytics, studyStatistics, practiceSessions })
  const learningBehaviourScore = computeLearningBehaviourScore({ learningBehaviour, studyStatistics })
  const confidenceIndex = computeConfidenceIndex({ examPerformance, quizResults, practiceSessions })
  const improvementIndex = computeImprovementIndex({ academicPerformance, examPerformance })

  const strengthWeakAreas = computeStrengthWeakAreas({ subjects, attendance, quizResults, practiceSessions, academicDnaInputs })
  const academicHealth = computeAcademicHealth({
    masterStudentProfile, attendance, academicHealthInputs, academicPerformance,
    consistencyScore, learningBehaviourScore,
  })
  /* Phase 2 — canonical exam-attempt evidence (buildExamEvidence output)
     flows into the existing Academic DNA engine. Optional: without it the
     graph computes exactly as before. */
  const academicDna = computeAcademicDna({
    academicDnaInputs, subjects, attendance, quizResults, practiceSessions,
    attemptSignals: extra?.attemptSignals ?? null,
  })

  /* ---- Phase 27.1: ONE readiness orchestration layer (university +
         competitive strategies; single authoritative value per context) ---- */
  const readiness = buildReadinessIntelligence({
    universityExams, competitiveExams, examReadinessInputs, examPerformance,
    practiceSessions, quizResults, attendance, assignments,
    courses, subjects, learningBehaviour, competitivePyqPerformance,
    academicDna, academicDnaInputs, academicHealth,
    learningBehaviourScore, consistencyScore, chapterMastery, topicMastery,
  })

  const examReadiness = computeExamReadiness({ readiness })
  const examIntelligence = buildExamIntelligence({ readiness })

  const interventions = evaluateInterventions({
    attendance, academicPerformance, assignments, practiceSessions, interventionRules,
    quizResults, academicDnaInputs, examReadiness,
  })
  const recommendationsRanked = generateRecommendations({ recommendations, academicDna, examReadiness, interventions })
  const recommendationsTagged = recommendationsRanked.map((r) => ({ ...r, context: tagRecommendationContext(r) }))

  const achievementProgress = computeAchievementProgress({ achievements })
  const careerReadiness = computeCareerReadiness({ careerProfile, digitalPortfolio, academicDna })
  const portfolioWorkspace = {
    portfolio: digitalPortfolio,
    career: careerReadiness,
    completion: buildPortfolioCompletion({ digitalPortfolio, achievements: achievementProgress, careerReadiness }),
  }
  const academicJourneyTimeline = buildAcademicJourney({ academicJourney, notifications, achievements })

  const dailyBrief = buildDailyBrief({
    profile: masterStudentProfile, attendance, studyStatistics, todaySchedule, assignments,
    universityExams, competitiveExams, academicHealth, recommendations: recommendationsTagged,
  })
  const recentActivities = buildRecentActivities({
    notifications, assignments, examPerformance, achievements, academicHealth, careerReadiness,
  })
  const upcomingDeadlines = buildUpcomingDeadlines({ assignments, universityExams, competitiveExams, projects })

  /* ---- AI Academic DNA workspace (flagship, university + competitive) ---- */
  const dnaWorkspace = {
    executive: buildDnaExecutiveSummary({ academicHealth, consistencyScore, confidenceIndex, improvementIndex, learningBehaviourScore }),
    strengths: buildStrengthAnalysis({ derived: { strengths: strengthWeakAreas.strengths } }),
    weaknesses: buildWeaknessAnalysis({ derived: { weaknesses: strengthWeakAreas.weaknesses }, chapterMastery, academicDna }),
    healthBreakdown: buildHealthBreakdown({ healthBreakdownInputs }),
    learningBehaviour: buildLearningBehaviourAnalysis({ learningBehaviourDetailed, learningBehaviourScore }),
    subjectMastery: buildSubjectMasteryDetail({ academicDna, chapterMastery }),
    chapterMastery: buildChapterMastery({ chapterMastery, subjects }),
    topicMastery: buildTopicMastery({ topicMastery }),
    mistakes: buildMistakeIntelligence({ mistakeIntelligence }),
    opportunities: buildImprovementOpportunities({ derived: { weaknesses: strengthWeakAreas.weaknesses }, mistakeIntelligence: null }),
    weeklyPlan: buildWeeklyActionPlan({ weeklyActionPlan }),
    prediction: buildImprovementPrediction({ improvementPrediction, academicHealth }),
  }

  /* ---- Phase 27.1: UNIVERSITY CONTEXT (first-class) ---- */
  const university = buildUniversityIntelligence({
    profile: masterStudentProfile,
    datasets: {
      universityExams, competitiveExams, examPerformance, attendance, attendanceAnalytics,
      assignments, courses, subjects, academicPerformance, projects,
      studyStatistics, academicResources, events, courseModules,
    },
    derived: {
      academicHealth, academicDna, strengths: strengthWeakAreas.strengths,
      weaknesses: strengthWeakAreas.weaknesses, recommendations: recommendationsTagged,
      consistencyScore, confidenceIndex, improvementIndex, learningBehaviourScore,
      academicJourney: academicJourneyTimeline,
    },
    readiness: readiness.university,
  })

  /* ---- Phase 27.1: COMPETITIVE CONTEXT (JEE · NEET) ---- */
  const competitive = buildCompetitiveIntelligence({
    profile: masterStudentProfile,
    datasets: {
      competitiveExams, examPerformance, practiceSessions, quizResults,
      mistakeIntelligence, competitivePyqPerformance, academicJourney,
    },
    derived: {
      academicJourney: academicJourneyTimeline,
      recommendations: recommendationsTagged,
    },
    readiness,
  })

  /* Academic DNA supports BOTH contexts — the competitive signals stay
     distinguishable on the same object (Part 13). */
  const academicDnaWithCompetitive = { ...academicDna, competitive: competitive.dna }

  return {
    academicHealth,
    examIntelligence,
    portfolioWorkspace,
    dnaWorkspace,
    dailyBrief,
    recentActivities,
    upcomingDeadlines,
    consistencyScore,
    learningBehaviourScore,
    confidenceIndex,
    improvementIndex,
    strengths: strengthWeakAreas.strengths,
    weaknesses: strengthWeakAreas.weaknesses,
    subjectMasteryRanking: strengthWeakAreas.ranking,
    academicDna: academicDnaWithCompetitive,
    examReadiness,
    interventions,
    recommendations: recommendationsTagged,
    careerReadiness,
    achievements: achievementProgress,
    academicJourney: academicJourneyTimeline,
    /* ---- Phase 27.1 contract keys ---- */
    readiness,
    university,
    competitive,
    generatedAt: new Date().toISOString(),
  }
}

/** Fully assembled Student Intelligence snapshot (profile + base + derived).
    Phase 11: base datasets are injected by the service layer (backend), so
    this assembler never default-imports backend-owned seed data at runtime. */
export function getStudentIntelligence(extra = {}, baseDatasets = datasets) {
  return {
    profile: masterStudentProfile,
    datasets: baseDatasets,
    derived: computeDerivedIntelligence(extra),
  }
}

/** Deterministic snapshot for caching/SSR — strips the timestamp. */
export function getStudentIntelligenceSnapshot(extra = {}, baseDatasets = datasets) {
  const derived = computeDerivedIntelligence(extra)
  delete derived.generatedAt
  return { profile: masterStudentProfile, datasets: baseDatasets, derived }
}

export default getStudentIntelligence
