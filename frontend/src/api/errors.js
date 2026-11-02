/**
 * FastAPI / EduX API error normalisation.
 *
 * HTTP errors use `{ detail: string | ValidationError[] }`.
 * Several faculty mutations return HTTP 200 with `{ ok: false, error }`.
 * Neither shape is a success.
 */

export function messageFromDetail(detail) {
  if (detail == null) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return item.msg || item.message || null
        return null
      })
      .filter(Boolean)
    return parts.length ? parts.join('; ') : null
  }
  if (typeof detail === 'object' && (detail.msg || detail.message)) {
    return detail.msg || detail.message
  }
  return null
}

export function messageFromPayload(data) {
  if (data == null) return null
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return null
  return (
    messageFromDetail(data.detail)
    || (typeof data.error === 'string' ? data.error : null)
    || (typeof data.message === 'string' ? data.message : null)
  )
}

export function isBackendFailurePayload(data) {
  return Boolean(data && typeof data === 'object' && data.ok === false)
}

export function apiErrorFromPayload(data, { status = 200, config, response } = {}) {
  const message = messageFromPayload(data) || 'Request failed'
  const error = new Error(message)
  error.response = response ?? { status, data, config }
  error.config = config
  error.payload = data
  error.isBackendOkFalse = data?.ok === false
  return error
}

export function normalizeAxiosError(error) {
  if (!error) return error
  const fromBody = messageFromPayload(error.response?.data)
  if (fromBody) error.message = fromBody
  else if (!error.response) {
    // Timeout: ECONNABORTED is set by axios when the timeout fires.
    // Give a clear user-facing message instead of the raw "timeout of Xms exceeded".
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      error.message = 'Sign in timed out — the backend is taking too long to respond. Make sure the backend server is running and try again.'
    } else {
      error.message = error.message || 'Network error — please check your connection and try again'
    }
  }
  // Development diagnostics: keep the safe backend error detail visible in
  // the console so real API failures can be diagnosed from the browser.
  // Never logs headers/tokens/body; production builds stay silent — the UI
  // shows the generic ErrorState instead.
  try {
    if (import.meta.env?.DEV && (error.response || error.isBackendOkFalse) && typeof console !== 'undefined') {
      const method = (error.config?.method || 'get').toUpperCase()
      const url = error.config?.url || '(unknown url)'
      const status = error.response?.status ?? 'ok:false'
      console.error(`[edux-api] ${method} ${url} -> ${status}: ${error.message}`)
    }
  } catch { /* diagnostics must never break the app */ }
  return error
}

export default {
  messageFromDetail,
  messageFromPayload,
  isBackendFailurePayload,
  apiErrorFromPayload,
  normalizeAxiosError,
}
