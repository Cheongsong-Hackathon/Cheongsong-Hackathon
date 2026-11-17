-- 느리(이전 버전)에서 쓰던 테이블 정리
DROP TABLE IF EXISTS verifications, activity_runs, rewards, activity_templates, mood_states CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  nickname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 위기 표현이 감지되면 true: 추천·예약을 멈추고 상담 안내만 보여 준다
ALTER TABLE users ADD COLUMN IF NOT EXISTS safe_mode boolean NOT NULL DEFAULT false;
-- 로그인 없이 브라우저마다 따로: 화면이 만든 무작위 키 (X-User-Key 헤더)
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_key text UNIQUE;

CREATE TABLE IF NOT EXISTS characters (
  user_id int PRIMARY KEY REFERENCES users(id),
  level int NOT NULL DEFAULT 1,
  exp int NOT NULL DEFAULT 0 CHECK (exp >= 0),
  stage int NOT NULL DEFAULT 1,
  patterns jsonb NOT NULL DEFAULT '[]'
);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS equipped text;

-- 속마음 대화
CREATE TABLE IF NOT EXISTS chat_sessions (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  state text NOT NULL DEFAULT 'CHATTING',
  started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  session_id int NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 제휴 매장 (체험을 파는 곳)
CREATE TABLE IF NOT EXISTS places (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_partner boolean NOT NULL DEFAULT false,
  partner_id int,
  open_hours jsonb,           -- {"open":"10:00","close":"22:00"}, NULL이면 항상 열림
  note text
);
CREATE TABLE IF NOT EXISTS partners (
  id serial PRIMARY KEY,
  place_id text NOT NULL REFERENCES places(id),
  fee_per_visit int NOT NULL DEFAULT 0,
  coupon_policy text NOT NULL
);

-- 체험 DB: 가격·시간은 여기 있는 값만 화면에 보여 준다 (AI가 만들지 않음)
CREATE TABLE IF NOT EXISTS experiences (
  id text PRIMARY KEY,
  place_id text NOT NULL REFERENCES places(id),
  title text NOT NULL,
  category text NOT NULL,      -- 그림 종류
  minutes int NOT NULL,
  price int NOT NULL CHECK (price >= 0),
  moods text[] NOT NULL DEFAULT '{}',
  energy_need int NOT NULL DEFAULT 0, -- 이 정도 에너지(%)는 있어야 할 만한 활동
  description text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS experience_slots (
  experience_id text NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  start_time text NOT NULL,    -- 'HH:MM' (오늘)
  PRIMARY KEY (experience_id, start_time)
);

-- 01 마음 확인 + 02 조건 확인
CREATE TABLE IF NOT EXISTS checkins (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  text text,
  emotion text,
  energy int,
  mood_score int CHECK (mood_score BETWEEN 1 AND 10),
  minutes int,
  walk_minutes int,
  budget int,
  risk text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 04 예약 요청 → 05 기분 기록
CREATE TABLE IF NOT EXISTS bookings (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  checkin_id int REFERENCES checkins(id) ON DELETE SET NULL,
  experience_id text NOT NULL REFERENCES experiences(id),
  slot_time text NOT NULL,
  price int NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','DONE','CANCELED')),
  mood_before int CHECK (mood_before BETWEEN 1 AND 10),
  mood_after int CHECK (mood_after BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 오늘 할 일 하나 미루기
CREATE TABLE IF NOT EXISTS postpones (
  id serial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id),
  task text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
