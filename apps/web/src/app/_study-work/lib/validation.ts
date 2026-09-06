export function isBlank(value: string): boolean {
  return value.trim().length === 0
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  return /^[+]?[\d\s()-]{7,}$/.test(value.trim())
}

export function isAdult(dateOfBirth: string): boolean {
  if (isBlank(dateOfBirth)) return false
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return false
  const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
  return age >= 16
}

export type Errors = Record<string, string>

export const REQUIRED_MESSAGE = 'This field is required.'
