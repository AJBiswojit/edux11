import { useQuery } from '@tanstack/react-query'
import { request } from '@/api/client'

/**
 * Admin (Institution) Intelligence Foundation — service hooks.
 * Consume the centralized profile / datasets / derived intelligence via the
 * API layer (swap to a real backend with VITE_USE_MOCK=false, zero code
 * changes). Mirrors the faculty intelligence service layer.
 */

export const ADMIN_INTEL_STALE_TIME = 5 * 60_000
export const ADMIN_INTEL_GC_TIME = 30 * 60_000

export const adminIntelligenceQuery = {
  queryKey: ['admin-intelligence', 'summary'],
  queryFn: () => request({ url: '/admin-intelligence/summary', timeout: 120000 }).then((r) => r.data),
  retry: 0,
  staleTime: ADMIN_INTEL_STALE_TIME,
  gcTime: ADMIN_INTEL_GC_TIME,
}

export const adminTeachingQuery = {
  queryKey: ['admin-intelligence', 'teaching'],
  queryFn: () => request({ url: '/admin-intelligence/teaching', timeout: 120000 }).then((r) => r.data),
  retry: 0,
  staleTime: ADMIN_INTEL_STALE_TIME,
  gcTime: ADMIN_INTEL_GC_TIME,
}

/* Phase 3 — consolidated to ONE canonical snapshot hook: /admin-intelligence/
   summary already embeds the master profile, all datasets and the derived
   intelligence (mirrors the faculty foundation contract). The unused
   /profile | /datasets | /derived view hooks were retired with their
   projection endpoints. */
export const useAdminIntelligence = () => useQuery(adminIntelligenceQuery)

export const useAdminTeachingIntelligence = () => useQuery(adminTeachingQuery)
