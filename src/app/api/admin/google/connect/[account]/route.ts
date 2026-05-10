export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { google } from 'googleapis'
import * as crypto from 'crypto'
import { signJwt } from '@/lib/crypto'

export async function GET(req: NextRequest, { params }: { params: { account: string } }) {
  const err = await requireAdmin(req)
  if (err) return err

  const account = params.account
  if (account !== 'fran' && account !== 'elisa') {
    return NextResponse.json({ error: 'Cuenta inválida' }, { status: 400 })
  }

  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: account,
    code_challenge: codeChallenge,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code_challenge_method: 'S256' as any,
  })

  const pkceToken = await signJwt(
    { codeVerifier, account },
    process.env.ACCESS_COOKIE_SECRET ?? 'dev-secret',
    '10m',
  )

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('oauth-pkce', pkceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
