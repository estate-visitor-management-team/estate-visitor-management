-- PostgreSQL starter schema. Review and migrate before production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'RESIDENT',
  'SECURITY'
);

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

CREATE TABLE estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES estates(id),
  house_number text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(estate_id, house_number)
);

CREATE TABLE users (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(estate_id, username),
  UNIQUE(estate_id, staff_id)
);

CREATE TABLE resident_houses (
  resident_id uuid NOT NULL REFERENCES users(id),
  house_id uuid NOT NULL REFERENCES houses(id),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY(resident_id, house_id)
);

CREATE TABLE guard_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id uuid NOT NULL REFERENCES users(id),
  estate_id uuid NOT NULL REFERENCES estates(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  assigned_by uuid REFERENCES users(id)
);

CREATE TABLE visitors (
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

CREATE TABLE access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  token_hash text NOT NULL UNIQUE,
  token_type text NOT NULL CHECK(token_type IN ('ENTRY', 'EXIT')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  requested_by_guard_id uuid NOT NULL REFERENCES users(id),
  decided_by_resident_id uuid REFERENCES users(id),
  decision text CHECK(decision IN ('ACCEPTED', 'REJECTED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE exit_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES visitors(id),
  guard_id uuid NOT NULL REFERENCES users(id),
  resident_phone_called boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  notes text
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  estate_id uuid NOT NULL REFERENCES estates(id),
  actor_user_id uuid REFERENCES users(id),
  visitor_id uuid REFERENCES visitors(id),
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitors_estate_status_idx
ON visitors(estate_id, status);

CREATE INDEX visitors_house_created_idx
ON visitors(house_id, created_at DESC);

CREATE INDEX audit_estate_created_idx
ON audit_events(estate_id, created_at DESC);