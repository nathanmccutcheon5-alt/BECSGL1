import { SignJWT, jwtVerify } from 'jose'
import { createServiceClient } from './supabase'

const COMMISSIONER_SECRET = new TextEncoder().encode(
  process.env.COMMISSIONER_JWT_SECRET || 'fallback-dev-secret-change-in-production'
)

// ─── Commissioner ──────────────────────────────────────────────────────────

export async function signCommissionerToken(): Promise<string> {
  return new SignJWT({ role: 'commissioner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(COMMISSIONER_SECRET)
}

export async function verifyCommissionerToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, COMMISSIONER_SECRET)
    return payload.role === 'commissioner'
  } catch {
    return false
  }
}

// ─── Team tokens ───────────────────────────────────────────────────────────
// Each team has a static token stored in the DB. The URL /team/[token] identifies them.

export async function getTeamByToken(token: string): Promise<{ id: number; short_name: string } | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('teams')
    .select('id, short_name')
    .eq('token', token)
    .single()
  return data
}
