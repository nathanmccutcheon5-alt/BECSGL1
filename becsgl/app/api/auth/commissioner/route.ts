import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signCommissionerToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (email !== process.env.COMMISSIONER_EMAIL) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, process.env.COMMISSIONER_PASSWORD_HASH || '')
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signCommissionerToken()

  const res = NextResponse.json({ ok: true })
  res.cookies.set('comm_token', token, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 12, path: '/'
  })
  return res
}
