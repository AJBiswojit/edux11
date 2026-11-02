/**
 * MediXO EduX validators — pure validation functions designed to plug into
 * React Hook Form `register` rules (no external validation library needed).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[0-9+\-\s]{10,15}$/
// Roll numbers: 4–20 alphanumeric/hyphen characters with no spaces (no @)
const ROLL_NO_RE = /^[A-Za-z0-9\-_.]{4,20}$/

export function validateEmail(value) {
  if (!value) return 'Roll number is required'
  // Accept either a valid email OR a roll number (no "@" present)
  if (value.includes('@')) {
    if (!EMAIL_RE.test(value)) return 'Enter a valid email address'
  } else {
    if (!ROLL_NO_RE.test(value)) return 'Enter a valid roll number'
  }
  return true
}

export function validateEmailOnly(value) {
  if (!value) return 'Email address is required'
  if (!EMAIL_RE.test(value)) return 'Enter a valid email address'
  return true
}

export function validatePassword(value) {
  if (!value) return 'Password is required'
  if (value.length < 8) return 'Password must be at least 8 characters'
  return true
}

export function validateStrongPassword(value) {
  if (!value) return 'New password is required'
  if (value.length < 8) return 'At least 8 characters'
  if (!/[A-Z]/.test(value)) return 'Include an uppercase letter'
  if (!/[0-9]/.test(value)) return 'Include a number'
  return true
}

export function validateConfirmPassword(value, password) {
  if (!value) return 'Please confirm your password'
  if (value !== password) return 'Passwords must match'
  return true
}

export function validateOtp(value) {
  if (!value) return 'OTP is required'
  if (!/^\d{6}$/.test(value)) return 'OTP must be 6 digits'
  return true
}

export function validateName(value, label = 'Full name') {
  if (!value) return `${label} is required`
  if (value.trim().length < 3) return `${label} must be at least 3 characters`
  return true
}

export function validatePhone(value) {
  if (!value) return 'Phone number is required'
  if (!PHONE_RE.test(value)) return 'Enter a valid phone number'
  return true
}

export function validateRequired(value, label = 'This field') {
  if (!value || (Array.isArray(value) && value.length === 0)) return `${label} is required`
  return true
}

export function validateMessage(value) {
  if (!value) return 'Message is required'
  if (value.trim().length < 10) return 'Message should be at least 10 characters'
  return true
}

export const RULES = {
  email: { validate: validateEmail },
  emailOnly: { validate: validateEmailOnly },
  password: { validate: validatePassword },
  strongPassword: { validate: validateStrongPassword },
  otp: { validate: validateOtp },
  name: { validate: validateName },
  phone: { validate: validatePhone },
  message: { validate: validateMessage },
  required: (label) => ({ validate: (v) => validateRequired(v, label) }),
}
