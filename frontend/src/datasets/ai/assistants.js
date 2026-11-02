/**
 * AI assistants — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded AI tutor /
 * copilot / teaching-assistant threads, quick prompts, learning path,
 * recommendations, predictions and graph-search results were backend-owned
 * entity data. They are physically REMOVED — the AI surfaces receive all of
 * this from the service layer (backend).
 *
 * Export names are preserved so the intelligence aggregation still resolves;
 * every value is empty (UI consumes loading/empty/neutral state).
 */

export const aiTutorThreads = []
export const aiTutorQuickPrompts = []
export const copilotSuggestions = {}
export const aiTeachingAssistantThreads = []
export const learningPath = {}
export const aiRecommendations = []
export const aiWeaknesses = []
export const aiPrediction = {}
export const graphSearch = {}
export const aiConversationStats = {}
export const quizGeneratorSample = {}
export const examGeneratorSample = {}
