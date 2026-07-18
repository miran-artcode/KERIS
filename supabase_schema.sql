-- ── Supabase 스키마 ────────────────────────────────────────
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행합니다.

-- 세션(강의 1회)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  join_code text not null unique,      -- 참가자 접속 코드
  subject_scope text,                  -- 예: '음악·미술·체육 공통'
  consent_config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 참가자
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  display_name text not null,
  subject text,                        -- 참가자 담당 과목(음악/미술/체육)
  consent_flags jsonb default '{}'::jsonb, -- {mic, webcamAttention, snapshot}
  consented_at timestamptz,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- 이벤트 로그(핵심 스트림)
-- type 예: 'join','phase','activity_start','activity_end','poll_answer',
--          'attention','reaction','text','snapshot','heartbeat'
create table if not exists events (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  ts timestamptz not null default now(),
  type text not null,
  payload jsonb default '{}'::jsonb
);
create index if not exists events_session_ts on events(session_id, ts);
create index if not exists events_participant on events(participant_id);

-- 강의자 발화 전사
create table if not exists transcript (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  ts timestamptz not null default now(),
  speaker text default 'instructor',
  text text not null
);
create index if not exists transcript_session_ts on transcript(session_id, ts);

-- ── 실시간 활성화 ──────────────────────────────────────────
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table participants;

-- ── 접근 정책(RLS) ─────────────────────────────────────────
-- 아래는 워크숍용 최소 정책입니다. anon 키는 브라우저에 노출되므로,
-- join_code가 추측되지 않게 관리하고 연수 종료 후 데이터를 삭제하십시오.
-- 더 엄격히 하려면 Supabase Auth를 붙여 정책을 사용자 기준으로 바꾸십시오.
alter table sessions enable row level security;
alter table participants enable row level security;
alter table events enable row level security;
alter table transcript enable row level security;

create policy sessions_read on sessions for select using (true);
create policy sessions_write on sessions for insert with check (true);

create policy participants_rw on participants for all using (true) with check (true);
create policy events_rw on events for all using (true) with check (true);
create policy transcript_rw on transcript for all using (true) with check (true);

-- ── 스냅샷 저장소(동의 시에만 사용) ────────────────────────
-- 대시보드 → Storage 에서 'snapshots' 버킷을 만들고 비공개로 둡니다.
-- 스냅샷 경로는 events.payload.path 에 기록됩니다.

-- ── 보관 기간 삭제(수동 실행 예시) ─────────────────────────
-- delete from sessions where created_at < now() - interval '30 days';
