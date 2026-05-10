import { query, queryOne } from '../pool'
import type { OAuthToken, GoogleAccount } from '@/types'
import { encryptAes, decryptAes } from '@/lib/crypto'

const ENC_KEY = () => process.env.GOOGLE_TOKENS_ENC_KEY ?? ''

export const oauthTokensRepo = {
  async get(account: GoogleAccount): Promise<OAuthToken | null> {
    const row = await queryOne<{
      account: string
      access_token: string
      refresh_token: string
      expires_at: string
      scopes: string[]
    }>('SELECT * FROM oauth_tokens WHERE account = $1', [account])
    if (!row) return null
    return {
      account: row.account as GoogleAccount,
      access_token: decryptAes(row.access_token, ENC_KEY()),
      refresh_token: decryptAes(row.refresh_token, ENC_KEY()),
      expires_at: row.expires_at,
      scopes: row.scopes,
    }
  },

  async upsert(data: OAuthToken): Promise<void> {
    const enc_access = encryptAes(data.access_token, ENC_KEY())
    const enc_refresh = encryptAes(data.refresh_token, ENC_KEY())
    await query(
      `INSERT INTO oauth_tokens (account, access_token, refresh_token, expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (account) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         scopes = EXCLUDED.scopes`,
      [data.account, enc_access, enc_refresh, data.expires_at, data.scopes],
    )
  },
}
