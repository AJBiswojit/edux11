import axios from 'axios'
import { APP_CONFIG } from '@/config'
import { apiErrorFromPayload, isBackendFailurePayload, normalizeAxiosError } from './errors'

/**
 * MediXO EduX axios instance — the single HTTP client for the platform.
 *
 * - Request interceptor attaches the bearer token from storage.
 * - HTTP 200 `{ ok: false }` is treated as failure (faculty mutations).
 * - FastAPI `{ detail }` is copied onto `error.message`.
 * - Response interceptor refreshes expired access tokens and replays once.
 */
export const api = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem(APP_CONFIG.TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(normalizeAxiosError(error))
)

let isRefreshing = false
let queue = []

function flushQueue(error, token = null) {
  queue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)))
  queue = []
}

api.interceptors.response.use(
  (response) => {
    if (isBackendFailurePayload(response.data)) {
      return Promise.reject(apiErrorFromPayload(response.data, {
        status: response.status,
        config: response.config,
        response,
      }))
    }
    return response
  },
  async (error) => {
    const original = error.config
    // Skip token refresh for auth endpoints — a 401 from /auth/login means
    // wrong credentials, not an expired token. Attempting a refresh here is
    // wrong and produces a spurious 422 (no refresh token in storage yet).
    const isAuthEndpoint = original?.url && /\/auth\/(login|refresh|register|forgot-password|reset-password|verify-otp|verify-email|resend-otp)/.test(original.url)
    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true
      try {
        const refreshToken = window.localStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY)
        const { data } = await axios.post(`${APP_CONFIG.API_BASE_URL}/auth/refresh`, { refreshToken })
        if (!data?.accessToken) {
          throw new Error('Refresh did not return an access token')
        }
        window.localStorage.setItem(APP_CONFIG.TOKEN_KEY, data.accessToken)
        if (data.refreshToken) {
          window.localStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken)
        }
        flushQueue(null, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (refreshError) {
        flushQueue(refreshError)
        window.localStorage.removeItem(APP_CONFIG.TOKEN_KEY)
        window.localStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY)
        window.location.href = '/auth/login'
        return Promise.reject(normalizeAxiosError(refreshError))
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(normalizeAxiosError(error))
  }
)

export default api
