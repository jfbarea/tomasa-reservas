import { google } from 'googleapis'
import type { GoogleAccount } from '@/types'
import { oauthTokensRepo } from '@/lib/db/repo/oauthTokens'

export async function googleClient(account: GoogleAccount) {
  const tokens = await oauthTokensRepo.get(account)
  if (!tokens) throw new Error(`No hay tokens para la cuenta ${account}`)

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )

  oauth2.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: new Date(tokens.expires_at).getTime(),
  })

  oauth2.on('tokens', async (newTokens) => {
    await oauthTokensRepo.upsert({
      account,
      access_token: newTokens.access_token ?? tokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      expires_at: new Date(newTokens.expiry_date ?? Date.now() + 3600000).toISOString(),
      scopes: tokens.scopes,
    })
  })

  return google.calendar({ version: 'v3', auth: oauth2 })
}
