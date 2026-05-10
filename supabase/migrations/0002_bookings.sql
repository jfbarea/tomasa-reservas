CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  guests_count int NOT NULL DEFAULT 1,
  notes text,
  status booking_status NOT NULL DEFAULT 'pending',
  google_event_id_fran text,
  google_event_id_elisa text,
  cancel_token text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_dates_check CHECK (start_date < end_date),
  CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (daterange(start_date, end_date, '[)') WITH &&)
    WHERE (status IN ('pending', 'confirmed'))
);

CREATE INDEX bookings_status_idx ON bookings (status);
CREATE INDEX bookings_dates_idx ON bookings (start_date, end_date);
