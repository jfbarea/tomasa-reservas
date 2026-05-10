CREATE TABLE booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status booking_status,
  to_status booking_status NOT NULL,
  actor text NOT NULL,
  at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX booking_events_booking_idx ON booking_events (booking_id);
