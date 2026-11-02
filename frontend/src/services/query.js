import request from '@/api/client'

/**
 * Shared query-options helper for TanStack Query hooks.
 * `path` is the API endpoint path; `key` is the query cache key.
 */
export function getQuery(path, key, extra = {}) {
  return {
    queryKey: key,
    queryFn: () => request({ url: path }).then((r) => r.data),
    ...extra,
  }
}

export default getQuery
