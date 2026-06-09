-- Run this in your Supabase dashboard → SQL Editor

-- ─── Teams ────────────────────────────────────────────────────────────────────
create table if not exists teams (
  id          int primary key,
  short_name  text not null,
  player1     text not null,
  player2     text not null,
  phone1      text,
  phone2      text,
  token       text unique not null default gen_random_uuid()::text
);

-- ─── Matches ──────────────────────────────────────────────────────────────────
create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  week        int not null check (week between 1 and 15),
  team_a      int not null references teams(id),
  team_b      int not null references teams(id),
  scores_a    int[],         -- 9 hole scores for team A
  scores_b    int[],         -- 9 hole scores for team B
  drives_a    int[],         -- per-hole driver index (0 or 1) for team A
  drives_b    int[],         -- per-hole driver index (0 or 1) for team B
  pts_a       int,           -- final points for team A (set when locked)
  pts_b       int,           -- final points for team B (set when locked)
  submitted_a boolean not null default false,
  submitted_b boolean not null default false,
  status      text not null default 'pending' check (status in ('pending','partial','locked')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Prevent duplicate matches for the same week/teams
create unique index if not exists matches_week_teams
  on matches (week, least(team_a, team_b), greatest(team_a, team_b));

-- ─── Seed teams ───────────────────────────────────────────────────────────────
-- Tokens are auto-generated UUIDs. After running this you can find each
-- team's token by running: select id, short_name, token from teams;
-- Then text each team their link: https://yourapp.vercel.app/team/<token>

insert into teams (id, short_name, player1, player2, phone1, phone2) values
(1,  'Klein/Riggs',          'Klein',         'Riggs',         '4806505522', '7196499513'),
(2,  'Sabori/Ramirez',       'Sabori',        'Ramirez E.',    '4804140667', '4805848762'),
(3,  'Tortorelli/Driskill',  'Tortorelli',    'Driskill',      '7193044314', '7192385072'),
(4,  'Walker/Baker',         'Walker',        'Baker',         '4806398240', '4804590561'),
(5,  'Merrifield/Merrifield','Merrifield S.', 'Merrifield M.', '4805329372', '4805329372'),
(6,  'Gibbons/Underwood',    'Gibbons',       'Underwood',     '8183784744', '2066177785'),
(7,  'McEwen/McEwen',        'McEwen B.',     'McEwen R.',     '4802314874', '4805705677'),
(8,  'Cratte/Carpenter',     'Cratte',        'Carpenter',     '4807730201', '4805228918'),
(9,  'Keller/Reidhead',      'Keller',        'Reidhead',      '4808592936', '4808690547'),
(10, 'Stellflug/Glaberman',  'Stellflug',     'Glaberman',     '9712416688', '4802501489'),
(11, 'Kerns/Lewis',          'Kerns',         'Lewis',         '4802016839', '4803180011'),
(12, 'Ramirez/McCutcheon',   'Ramirez D.',    'McCutcheon',    '4802289576', '4258796215'),
(13, 'Castenada/Tant',       'Castenada',     'Tant',          '4807205417', '4804664604'),
(14, 'Evans/McEwen G.',      'Evans',         'McEwen G.',     '6024104591', '4808613126'),
(15, 'Alvarez/Chavez',       'Alvarez',       'Chavez',        '4803538596', '4805292679'),
(16, 'Pena/Tolle',           'Pena',          'Tolle',         '4802555333', '4802392310'),
(17, 'Stepanek/Stonehouse',  'Stepanek',      'Stonehouse',    '5205824773', '5203431264'),
(18, 'Pico/Ray',             'Pico',          'Ray',           '4806863760', '4802348943'),
(19, 'Villalobos/Villalobos','Villalobos F.', 'Villalobos N.', '4805142595', '6023425411'),
(20, 'Moya/Moya',            'Moya R.',       'Moya S.',       '4802014131', null)
on conflict (id) do nothing;

-- ─── Seed historical results (weeks 1-5) ─────────────────────────────────────
-- These are locked results from your existing spreadsheet.
-- Scores are final points only (hole-by-hole data not available for past weeks).
-- We store pts directly and mark as locked.

create or replace function seed_historical_match(
  p_week int, p_team_a int, p_team_b int, p_pts_a int, p_pts_b int
) returns void language plpgsql as $$
begin
  insert into matches (week, team_a, team_b, pts_a, pts_b, submitted_a, submitted_b, status)
  values (p_week, p_team_a, p_team_b, p_pts_a, p_pts_b, true, true, 'locked')
  on conflict do nothing;
end;
$$;

-- Week 1
select seed_historical_match(1,14,17,13,7);
select seed_historical_match(1,6,2,14,6);
select seed_historical_match(1,8,20,10,10);
select seed_historical_match(1,9,7,14,6);
select seed_historical_match(1,11,15,12,8);
select seed_historical_match(1,1,16,9,11);
select seed_historical_match(1,4,3,8,12);
select seed_historical_match(1,18,19,12,8);
select seed_historical_match(1,10,13,9,11);
select seed_historical_match(1,12,5,13,7);

-- Week 2
select seed_historical_match(2,17,10,10,10);
select seed_historical_match(2,19,11,8,12);
select seed_historical_match(2,15,6,8,12);
select seed_historical_match(2,7,14,10,10);
select seed_historical_match(2,16,12,4,16);
select seed_historical_match(2,3,1,12,8);
select seed_historical_match(2,4,9,5,15);
select seed_historical_match(2,5,8,0,0);
select seed_historical_match(2,20,2,2,18);
select seed_historical_match(2,13,18,8,12);

-- Week 3
select seed_historical_match(3,12,3,4,16);
select seed_historical_match(3,10,7,13,7);
select seed_historical_match(3,8,16,10,10);
select seed_historical_match(3,2,5,0,0);
select seed_historical_match(3,9,1,12,8);
select seed_historical_match(3,6,20,19,1);
select seed_historical_match(3,14,4,0,0);
select seed_historical_match(3,15,19,9,11);
select seed_historical_match(3,18,17,8,12);
select seed_historical_match(3,11,13,13,7);

-- Week 4
select seed_historical_match(4,13,15,8,12);
select seed_historical_match(4,17,11,7,13);
select seed_historical_match(4,4,10,12,8);
select seed_historical_match(4,12,9,0,0);
select seed_historical_match(4,16,2,0,0);
select seed_historical_match(4,3,8,14,6);
select seed_historical_match(4,7,18,6,14);
select seed_historical_match(4,5,20,0,0);
select seed_historical_match(4,1,14,0,0);
select seed_historical_match(4,19,6,7,13);

-- Week 5
select seed_historical_match(5,14,12,8,12);
select seed_historical_match(5,7,11,8,12);
select seed_historical_match(5,10,1,6,14);

drop function seed_historical_match;

-- ─── Row level security ───────────────────────────────────────────────────────
-- Public can read everything. Only the service role (API) can write.
alter table teams enable row level security;
alter table matches enable row level security;

create policy "public read teams"   on teams   for select using (true);
create policy "public read matches" on matches for select using (true);

-- Service role bypasses RLS automatically, so API routes can write freely.
