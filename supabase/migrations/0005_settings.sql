CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('auto_confirm', 'false'),
  ('min_notice_days', '3'),
  ('max_stay_days', '14'),
  ('max_guests', '4');
