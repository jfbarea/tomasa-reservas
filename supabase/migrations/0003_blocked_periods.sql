CREATE TABLE blocked_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_periods_dates_check CHECK (start_date < end_date),
  CONSTRAINT blocked_periods_no_overlap
    EXCLUDE USING gist (daterange(start_date, end_date, '[)') WITH &&)
);
