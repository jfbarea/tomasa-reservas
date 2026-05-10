CREATE OR REPLACE FUNCTION check_booking_block_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count int;
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    -- Prevent bookings that overlap a blocked period
    SELECT COUNT(*) INTO overlap_count
    FROM blocked_periods bp
    WHERE daterange(bp.start_date, bp.end_date, '[)') && daterange(NEW.start_date, NEW.end_date, '[)');
    IF overlap_count > 0 THEN
      RAISE EXCEPTION 'Booking overlaps with a blocked period' USING ERRCODE = '23P01';
    END IF;
  END IF;
  -- For blocked_periods: allow creation (app layer handles warnings)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_no_block_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_booking_block_overlap();

-- Trigger exists on blocked_periods but does not block creation (just returns NEW)
CREATE TRIGGER blocked_periods_no_booking_overlap
  BEFORE INSERT OR UPDATE ON blocked_periods
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_block_overlap();
