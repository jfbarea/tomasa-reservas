CREATE TYPE google_account AS ENUM ('fran', 'elisa');

CREATE TABLE oauth_tokens (
  account google_account PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}'
);
