import { useMutation, useQuery } from '@tanstack/react-query'
import request from '@/api/client'
import api from '@/api/axios'

/* ================= AUTH ================= */

/**
 * Phase 10 — backend-bound login. No DEMO_USERS, no fake credentials, no
 * automatic fake login. Credentials are validated by the backend
 * (POST /auth/login). When the backend is unavailable the promise rejects with
 * a network error and the login page renders the appropriate error state.
 *
 * Contract (docs/backend-integration/06-AUTHENTICATION-AUTHORIZATION-RBAC.md):
 *   POST /auth/login { email, password, role? }
 *     -> { user: { id, role, firstName, email, ... }, accessToken, refreshToken }
 */
export async function login({ email, password, role }) {
  const payload = { email, password }
  if (role) payload.role = role
  const { data } = await api.post('/auth/login', payload)
  if (!data?.accessToken) {
    throw new Error('Login did not return an access token')
  }
  const user = data.user ?? {}
  return {
    ...user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  }
}

export async function logout() {
  const { data } = await api.post('/auth/logout')
  return data
}

export function useLogin() {
  return useMutation({ mutationFn: login })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/forgot-password', data: payload }).then((r) => r.data),
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/verify-otp', data: payload }).then((r) => r.data),
  })
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/resend-otp', data: payload }).then((r) => r.data),
  })
}

export function useLogout() {
  return useMutation({ mutationFn: logout })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/reset-password', data: payload }).then((r) => r.data),
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/verify-email', data: payload }).then((r) => r.data),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload) =>
      request({ method: 'post', url: '/auth/change-password', data: payload }).then((r) => r.data),
  })
}

/* ================= REGISTRATION (Phase 28) ================= */

export function useRegistrationOptions() {
  return useQuery({ queryKey: ['auth', 'registration', 'options'], queryFn: () => request({ url: '/auth/registration/options' }).then((r) => r.data) })
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/register', data: payload }).then((r) => r.data),
  })
}

export function useRegisterVerifyOtp() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/auth/register/verify', data: payload }).then((r) => r.data),
  })
}

/* Phase 3 — retired unused hooks: useRegistrationStatus / useProfileSetup
   (the auth flow runs through AuthContext + register/OTP mutations), and the
   platform GET hooks for testimonials/pricing/faqs/stats (landing sections
   read the same canonical datasets from @/datasets/platform/content.js directly). */

/* ================= PLATFORM ================= */

export function useBlogPosts() {
  return useQuery({ queryKey: ['platform', 'blog'], queryFn: () => request({ url: '/platform/blog' }).then((r) => r.data) })
}

export function useBlogPost(id) {
  return useQuery({
    queryKey: ['platform', 'blog', id],
    queryFn: () => request({ url: `/platform/blog/${id}` }).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCareers() {
  return useQuery({ queryKey: ['platform', 'careers'], queryFn: () => request({ url: '/platform/careers' }).then((r) => r.data) })
}

export function useCaseStudies() {
  return useQuery({ queryKey: ['platform', 'case-studies'], queryFn: () => request({ url: '/platform/case-studies' }).then((r) => r.data) })
}

export function useNewsletter() {
  return useMutation({ mutationFn: (payload) => request({ method: 'post', url: '/platform/newsletter', data: payload }).then((r) => r.data) })
}

export function useContactForm() {
  return useMutation({ mutationFn: (payload) => request({ method: 'post', url: '/platform/contact', data: payload }).then((r) => r.data) })
}
