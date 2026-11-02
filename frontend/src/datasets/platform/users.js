/**
 * Platform directory — backend-owned users/departments (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the authoritative student
 * roster, faculty list, admin users and department catalogue were backend-
 * owned entity seeds served by the (now-removed) in-browser prototype
 * adapter. They are physically REMOVED — no seeded identities remain.
 *
 * The Admin / Student / Faculty pages receive their people and department
 * data from the service layer (backend). This module now only preserves the
 * export contract (names) so the intelligence aggregation still resolves;
 * every value is empty.
 */

export const STUDENT_ROSTER = []
export const FACULTY_LIST = []
export const ADMIN_USERS = []
export const DEPARTMENTS = []
