CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  nickname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  user_id int PRIMARY KEY REFERENCES users(id),
  level int NOT NULL DEFAULT 1,
  exp int NOT NULL DEFAULT 0 CHECK (exp >= 0),
  stage int NOT NULL DEFAULT 1,
  patterns jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'CHATTING'
    CHECK (state IN ('IDLE','CHATTING','SAFETY','RECOMMENDED','IN_PROGRESS','VERIFYING','REWARDED','EXPIRED')),
  started_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  session_id int NOT NULL REFERENCES chat_sessions(id),
  role text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mood_states (
  session_id int PRIMARY KEY REFERENCES chat_sessions(id),
  mood text,
  energy text CHECK (energy IN ('LOW','MID','HIGH')),
  free_minutes int,
  budget int
);

CREATE TABLE IF NOT EXISTS places (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_partner boolean NOT NULL DEFAULT false,
  partner_id int,
  open_hours jsonb,           -- {"open":"09:00","close":"21:00"}, NULL이면 항상 열림
  note text
);

CREATE TABLE IF NOT EXISTS partners (
  id serial PRIMARY KEY,
  place_id text NOT NULL REFERENCES places(id),
  fee_per_visit int NOT NULL DEFAULT 0,
  coupon_policy text NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_templates (
  id text PRIMARY KEY,
  title text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('HOME','NEAR','TOWN')),
  minutes int NOT NULL,
  exp int NOT NULL,
  verify_type text NOT NULL CHECK (verify_type IN ('BUTTON','GPS','PHOTO')),
  place_id text REFERENCES places(id)
);

CREATE TABLE IF NOT EXISTS activity_runs (
  id serial PRIMARY KEY,
  session_id int NOT NULL REFERENCES chat_sessions(id),
  template_id text NOT NULL REFERENCES activity_templates(id),
  place_id text REFERENCES places(id),
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','DONE','EXPIRED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  start_lat double precision,   -- 인증이 끝나거나 만료되면 NULL로 지움
  start_lng double precision,
  completed_at timestamptz,
  exp_gained int NOT NULL DEFAULT 0 CHECK (exp_gained >= 0)
);

CREATE TABLE IF NOT EXISTS verifications (
  id serial PRIMARY KEY,
  run_id int NOT NULL REFERENCES activity_runs(id),
  method text NOT NULL,
  status text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rewards (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  type text NOT NULL,
  partner_id int REFERENCES partners(id),
  required_level int NOT NULL,
  code text NOT NULL,
  used boolean NOT NULL DEFAULT false
);
