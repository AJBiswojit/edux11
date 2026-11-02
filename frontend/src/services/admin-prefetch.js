import { request } from '@/api/client'
import {
  ADMIN_INTEL_GC_TIME,
  ADMIN_INTEL_STALE_TIME,
  adminIntelligenceQuery,
} from '@/services/admin-intelligence'

function listQuery(path, key) {
  return {
    queryKey: key,
    queryFn: () => request({ url: path }).then((r) => r.data),
    staleTime: ADMIN_INTEL_STALE_TIME,
    gcTime: ADMIN_INTEL_GC_TIME,
  }
}

/**
 * Warm the admin snapshot first, then directory pages from the same cache.
 * Teaching intelligence is not prefetched — it is the heaviest query and only
 * needed on the Faculty tab.
 */
export function prefetchAdminWorkspace(queryClient) {
  if (!queryClient) return
  queryClient
    .prefetchQuery(adminIntelligenceQuery)
    .catch(() => {})
    .finally(() => {
      const jobs = [
        listQuery('/admin/students', ['admin', 'students']),
        listQuery('/admin/faculty', ['admin', 'faculty']),
        listQuery('/admin/reports', ['admin', 'reports']),
        listQuery('/admin/users', ['admin', 'users']),
        listQuery('/admin/departments', ['admin', 'departments']),
        listQuery('/admin/programs', ['admin', 'programs']),
        listQuery('/admin/support', ['admin', 'support']),
      ]
      jobs.forEach((options) => {
        queryClient.prefetchQuery(options).catch(() => {})
      })
    })
}
