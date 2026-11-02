/**
 * MediXO EduX — frontend API layer (production boundary).
 *
 * Phase 11 — the in-browser prototype router and its mock handlers have been
 * removed from production entirely. This module now only exposes the CENTRAL
 * REAL API client (axios) and the unified `request()` wrapper. No route
 * module is registered here, so the production runtime cannot serve a mock
 * response.
 *
 * Architecture:
 *   UI → hook/service (src/services) → request() (src/api/client)
 *      → axios instance → real backend (VITE_API_BASE_URL)
 */
export { default as api } from './axios'
export { default as request } from './client'
export { default } from './client'
