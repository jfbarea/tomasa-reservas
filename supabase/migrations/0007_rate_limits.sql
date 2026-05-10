CREATE TABLE rate_limits (
  id bigserial PRIMARY KEY,
  bucket text NOT NULL,
  key text NOT NULL,
  ts timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX rate_limits_bucket_key_ts_idx ON rate_limits (bucket, key, ts);
