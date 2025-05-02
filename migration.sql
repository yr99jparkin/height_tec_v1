-- Add a new 'processed' column to the wind_data table
ALTER TABLE wind_data ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE NOT NULL;

-- Create the historical wind data table
CREATE TABLE IF NOT EXISTS wind_data_historical (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  interval_start TIMESTAMP NOT NULL,
  interval_end TIMESTAMP NOT NULL,
  avg_wind_speed DOUBLE PRECISION NOT NULL,
  max_wind_speed DOUBLE PRECISION NOT NULL,
  std_deviation DOUBLE PRECISION,
  alert_triggered BOOLEAN DEFAULT FALSE NOT NULL,
  amber_alert_triggered BOOLEAN DEFAULT FALSE NOT NULL,
  red_alert_triggered BOOLEAN DEFAULT FALSE NOT NULL,
  downtime_seconds DOUBLE PRECISION DEFAULT 0,
  sample_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);