export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { verifyJwt } from '@/lib/crypto'
import { oauthTokensRepo } from '@/lib/db/repo/oauthTokens'
import type { GoogleAccount } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const pkceCookie = req.cookies.get('oauth-pkce')?.value
  if (!pkceCookie) {
    return NextResponse.json({ error: 'Estado PKCE no encontrado' }, { status: 400 })
  }

  let codeVerifier: string
  try {
    const payload = await verifyJwt(pkceCookie, process.env.ACCESS_COOKIE_SECRET ?? 'dev-secret')
    if (payload.account !== state) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    codeVerifier = payload.codeVerifier as string
  } catch {
    return NextResponse.json({ error: 'Token PKCE inválido' }, { status: 400 })
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  const { tokens } = await oauth2.getToken({ code, codeVerifier })

  await oauthTokensRepo.upsert({
    account: state as GoogleAccount,
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? '',
    expires_at: new Date(tokens.expiry_date ?? Date.now() + 3600000).toISOString(),
    scopes: (tokens.scope ?? '').split(' '),
  })

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000'}/admin/settings?connected=${state}`,
  )
  response.cookies.delete('oauth-pkce')
  return response
}
