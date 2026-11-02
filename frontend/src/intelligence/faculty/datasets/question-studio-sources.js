/**
 * Faculty Intelligence — Question Studio source catalog (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded curated source
 * catalog (source metadata + topics + question patterns) was backend-owned
 * content. It is physically REMOVED — the Question Studio page receives its
 * sources from the service layer (backend).
 *
 * Export names are preserved so the engine still resolves; the catalog is
 * empty (UI consumes loading/empty/neutral state).
 */

export const questionStudioSources = []

export default questionStudioSources
