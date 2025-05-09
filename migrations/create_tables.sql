-- Create tables for the wind monitoring system

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "full_name" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS "devices" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL UNIQUE,
  "device_name" TEXT NOT NULL UNIQUE,
  "user_id" INTEGER REFERENCES "users"("id"),
  "project" TEXT,
  "location" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_seen" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Device Stock table
CREATE TABLE IF NOT EXISTS "device_stock" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'Available',
  "last_allocated_to" TEXT DEFAULT 'new',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notification Contacts table
CREATE TABLE IF NOT EXISTS "notification_contacts" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "email" TEXT NOT NULL,
  "phone_number" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wind Alert Thresholds table
CREATE TABLE IF NOT EXISTS "wind_alert_thresholds" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL UNIQUE REFERENCES "devices"("device_id"),
  "amber_threshold" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
  "red_threshold" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wind Data table - short-term buffer that keeps the last 180 minutes of data
CREATE TABLE IF NOT EXISTS "wind_data" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "timestamp" TIMESTAMP NOT NULL,
  "wind_speed" DOUBLE PRECISION NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "alert_state" BOOLEAN NOT NULL DEFAULT FALSE,
  "amber_alert" BOOLEAN NOT NULL DEFAULT FALSE,
  "red_alert" BOOLEAN NOT NULL DEFAULT FALSE,
  "downtime_seconds" DOUBLE PRECISION DEFAULT 0,
  "processed" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wind Data Historical table - stores 10-minute aggregated data for long-term storage
CREATE TABLE IF NOT EXISTS "wind_data_historical" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "interval_start" TIMESTAMP NOT NULL,
  "interval_end" TIMESTAMP NOT NULL,
  "avg_wind_speed" DOUBLE PRECISION NOT NULL,
  "max_wind_speed" DOUBLE PRECISION NOT NULL,
  "std_deviation" DOUBLE PRECISION,
  "alert_triggered" BOOLEAN NOT NULL DEFAULT FALSE,
  "amber_alert_triggered" BOOLEAN NOT NULL DEFAULT FALSE,
  "red_alert_triggered" BOOLEAN NOT NULL DEFAULT FALSE,
  "downtime_seconds" DOUBLE PRECISION DEFAULT 0,
  "sample_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notification History table
CREATE TABLE IF NOT EXISTS "notification_history" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "notification_contact_id" INTEGER NOT NULL REFERENCES "notification_contacts"("id"),
  "alert_level" TEXT NOT NULL,
  "wind_speed" DOUBLE PRECISION NOT NULL,
  "sent_at" TIMESTAMP NOT NULL,
  "acknowledged" BOOLEAN NOT NULL DEFAULT FALSE,
  "acknowledged_at" TIMESTAMP,
  "acknowledged_action" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notification Tokens table
CREATE TABLE IF NOT EXISTS "notification_tokens" (
  "id" TEXT PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "notification_contact_id" INTEGER NOT NULL REFERENCES "notification_contacts"("id"),
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT FALSE
);

-- Notification Snooze Status table
CREATE TABLE IF NOT EXISTS "notification_snooze_status" (
  "id" SERIAL PRIMARY KEY,
  "device_id" TEXT NOT NULL REFERENCES "devices"("device_id"),
  "notification_contact_id" INTEGER NOT NULL REFERENCES "notification_contacts"("id"),
  "snoozed_until" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "notification_snooze_device_contact_idx" UNIQUE ("device_id", "notification_contact_id")
);

-- Session table for auth persistence
CREATE TABLE IF NOT EXISTS "session" (
  "sid" TEXT NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);