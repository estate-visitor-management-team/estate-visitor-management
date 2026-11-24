CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'RESIDENT',
    'SECURITY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE visit_status AS ENUM (
    'EXPECTED',
    'AWAITING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'INSIDE',
    'EXIT_REQUESTED',
    'EXITED',
    'COMPLETED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES estates(id),
  house_number text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(estate_id, house_number)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES estates(id),
  role user_role NOT NULL,
  full_name text NOT NULL,
  username text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  staff_id text,
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  expo_push_token text,
  password_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(estate_id, username)
);

CREATE UNIQUE INDEX IF NOT EXISTS users_staff_unique
ON users(estate_id, staff_id)
WHERE staff_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS resident_houses (
  resident_id uuid NOT NULL REFERENCES users(id),
  house_id uuid NOT NULL REFERENCES houses(id),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY(resident_id, house_id)
);

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES estates(id),
  resident_id uuid NOT NULL REFERENCES users(id),
  house_id uuid NOT NULL REFERENCES houses(id),
  full_name text NOT NULL,
  phone text NOT NULL,
  purpose text NOT NULL,
  expected_at timestamptz NOT NULL,
  additional_info text,
  status visit_status NOT NULL DEFAULT 'EXPECTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  entry_at timestamptz,
  exit_at timestamptz,
  entry_guard_id uuid REFERENCES users(id),
  exit_guard_id uuid REFERENCES users(id),
  resident_acknowledged_at timestamptz
);

CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  token_hash text NOT NULL UNIQUE,
  token_type text NOT NULL CHECK(token_type IN ('ENTRY', 'EXIT')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  requested_by_guard_id uuid NOT NULL REFERENCES users(id),
  decided_by_resident_id uuid REFERENCES users(id),
  decision text CHECK(decision IN ('ACCEPTED', 'REJECTED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS exit_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  guard_id uuid NOT NULL REFERENCES users(id),
  resident_phone_called boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  estate_id uuid NOT NULL REFERENCES estates(id),
  actor_user_id uuid REFERENCES users(id),
  visitor_id uuid REFERENCES visitors(id),
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS visitors_estate_status_idx
ON visitors(estate_id, status);

CREATE INDEX IF NOT EXISTS visitors_house_created_idx
ON visitors(house_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_estate_created_idx
ON audit_events(estate_id, created_at DESC);