/**
 * Faculty teaching — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded course /
 * timetable / announcement / quiz builder / AI studio / weak-student
 * detection data were backend-owned entity data. They are physically
 * REMOVED — the Faculty · Teaching page receives this from the service
 * layer (backend).
 *
 * Export names are preserved so the intelligence aggregation still resolves;
 * every value is empty (UI consumes loading/empty/neutral state).
 */

export const facultyCourses = []
export const facultyTimetable = []
export const facultyAnnouncements = []
export const facultyQuizBuilder = { quizzes: [], aiSuggestions: [] }
export const facultyAiStudio = { contentTypes: [], evaluationWorkflows: [] }
export const weakStudentDetection = { detections: [] }
