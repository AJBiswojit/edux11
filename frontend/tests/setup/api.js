/**
 * Shared API test setup — Phase 11 (Complete Physical Mock-Shim Removal).
 *
 * Phase 11 removed the in-browser prototype API router, its mock route
 * handlers, the prototype stores and the fake persistence entirely. There is
 * NO fake backend, no mock router and no seeded response available to tests.
 *
 * Production runtime is a strict backend consumer:
 *   Component → Hook (service) → request() (@/api/client) → axios → HTTP backend.
 *
 * Tests therefore exercise the REAL intelligence engines and the service
 * layer directly with isolated fixtures / factories / request mocks instead of
 * a complete fake backend. This module now only provides a localStorage shim
 * for tests that need a deterministic storage object, plus a tiny request
 * harness that can be used to stub the axios boundary at the service level.
 */

export function installTestStorage() {
  const mem = new Map()
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  }
  // Install on both globalThis and window for compatibility with
  // handlers that read window.localStorage
  globalThis.window = { localStorage: storage }
  globalThis.localStorage = storage
  return {
    mem,
    storage,
    clear: () => mem.clear(),
    reset: () => {
      mem.clear()
      globalThis.window = { localStorage: storage }
      globalThis.localStorage = storage
    },
  }
}

/**
 * A minimal, request-level mock for the axios boundary.
 *
 * Tests that used to hit the prototype router now stub the request layer with
 * an isolated fixture map keyed by `${method} ${url}`. This is NOT a fake
 * backend — it is a per-test request mock that returns only the contract
 * fixture that test needs. It works with the real `request()` client signature
 * `request({ method, url, params, data })` and returns `{ data, status }`.
 *
 * Usage:
 *   const request = makeRequestMock({
 *     'get /faculty/students': () => ({ students: [], batches: [] }),
 *     'post /faculty/interventions/a/status': ({ data }) => ({ status: data.status }),
 *   })
 */
export function makeRequestMock(routes = {}) {
  const call = (config = {}) => {
    const method = (config.method ?? 'get').toLowerCase()
    const url = (config.url ?? '').split('?')[0]
    const key = `${method} ${url}`
    const handler = routes[key]
    if (typeof handler !== 'function') {
      const error = new Error(`[request-mock] No handler for ${method.toUpperCase()} ${url}`)
      error.response = { status: 404, data: { message: error.message } }
      return Promise.reject(error)
    }
    return Promise.resolve({ data: handler(config), status: 200, headers: {}, config })
  }
  call.get = (url, params) => call({ method: 'get', url, params })
  call.post = (url, data) => call({ method: 'post', url, data })
  call.put = (url, data) => call({ method: 'put', url, data })
  call.patch = (url, data) => call({ method: 'patch', url, data })
  call.delete = (url) => call({ method: 'delete', url })
  return call
}
