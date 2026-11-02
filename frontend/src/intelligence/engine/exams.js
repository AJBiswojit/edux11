/**
 * Student Intelligence Engine — Examination Intelligence (compat layer).
 *
 * Phase 27.1: readiness calculation was UNIFIED into engine/readiness.js
 * (one orchestration layer, university + competitive strategies). This
 * module no longer computes readiness itself — it assembles the full
 * exam-intelligence list (both contexts) from the orchestrated snapshot,
 * sorted by exam date, preserving the exact entry shape the Examination
 * Intelligence workspace consumes.
 */

/**
 * Assemble the full exam-readiness workspace from the orchestrated
 * readiness snapshot (single source of truth — no duplicate calculations).
 */
export function buildExamIntelligence({ readiness }) {
  return [
    ...(readiness?.university ?? []),
    ...(readiness?.competitive ?? []),
  ].sort((a, b) => a.date.localeCompare(b.date))
}

export default buildExamIntelligence
