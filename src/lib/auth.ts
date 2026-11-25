import { CURRENT_USER_ID, employees } from '@/mocks/core'

/**
 * Demo authentication (no backend yet). Any active employee can sign in with their company e-mail and the
 * demo password; the session lives in localStorage ("remember me") or sessionStorage. Replace `signIn` with a
 * real API call later — screens only use `isAuthenticated`, `currentUserId`, `signIn` and `signOut`.
 */
const KEY = 'erp-session'
export const DEMO_EMAIL = 'rashid.al.amiri@apexaora.ae'
export const DEMO_PASSWORD = 'Apex@2026'

interface Session {
  userId: string
  at: string
}

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return read() !== null
}

/** Signed-in employee id (falls back to the demo admin). */
export function currentUserId() {
  return read()?.userId ?? CURRENT_USER_ID
}

export type SignInError = 'unknown-email' | 'wrong-password' | 'inactive'

export async function signIn(email: string, password: string, remember: boolean): Promise<{ ok: true } | { ok: false; error: SignInError }> {
  await new Promise((r) => setTimeout(r, 650))
  const user = employees.collection.all().find((e) => e.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) return { ok: false, error: 'unknown-email' }
  if (user.status === 'terminated') return { ok: false, error: 'inactive' }
  if (password !== DEMO_PASSWORD) return { ok: false, error: 'wrong-password' }
  const session: Session = { userId: user.id, at: new Date().toISOString() }
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
  ;(remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session))
  return { ok: true }
}

export function signOut() {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
}
