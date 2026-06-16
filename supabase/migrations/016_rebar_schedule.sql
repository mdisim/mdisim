-- Rebar Schedule System
-- Safe to run in Supabase SQL Editor.
-- Uses projects.created_by = auth.uid() — the RLS pattern in this codebase.

-- ─── Elements ────────────────────────────────────────────────────────────────
create table if not exists rebar_elements (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id) on delete cascade,
  drawing_id      uuid        references drawing_files(id) on delete set null,
  element_type    text        not null check (element_type in ('beam','column','slab','footing','wall','stair','pile','raft','other')),
  element_mark    text        not null,
  floor_level     text,
  dimensions      jsonb       not null default '{}',
  notes           text,
  sort_order      integer     not null default 0,
  created_by      uuid        references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Bars (BBS rows) ─────────────────────────────────────────────────────────
create table if not exists rebar_bars (
  id                 uuid        primary key default gen_random_uuid(),
  element_id         uuid        not null references rebar_elements(id) on delete cascade,
  bar_mark           text        not null,
  diameter_mm        integer     not null,
  shape_code         text        not null default '00',
  bending_dims       jsonb       not null default '{}',
  cut_length_mm      numeric(10,1),
  quantity           integer     not null default 1,
  unit_weight_kg_m   numeric(8,4),
  total_weight_kg    numeric(10,3),
  notes              text,
  sort_order         integer     not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── Indices ─────────────────────────────────────────────────────────────────
create index if not exists rebar_elements_project_id_idx on rebar_elements(project_id);
create index if not exists rebar_bars_element_id_idx     on rebar_bars(element_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create or replace function update_rebar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rebar_elements_updated_at on rebar_elements;
create trigger rebar_elements_updated_at
  before update on rebar_elements
  for each row execute function update_rebar_updated_at();

drop trigger if exists rebar_bars_updated_at on rebar_bars;
create trigger rebar_bars_updated_at
  before update on rebar_bars
  for each row execute function update_rebar_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────
alter table rebar_elements enable row level security;
alter table rebar_bars     enable row level security;

-- Drop old policies if re-running this migration
drop policy if exists "project_members_rebar_elements" on rebar_elements;
drop policy if exists "project_members_rebar_bars"     on rebar_bars;
drop policy if exists "Users manage own rebar elements" on rebar_elements;
drop policy if exists "Users manage own rebar bars"     on rebar_bars;

-- rebar_elements: accessible when the parent project was created by the user
create policy "Users manage own rebar elements"
  on rebar_elements
  using (
    exists (
      select 1 from projects
      where projects.id = rebar_elements.project_id
        and projects.created_by = auth.uid()
    )
  );

-- rebar_bars: accessible when the parent element's project was created by the user
create policy "Users manage own rebar bars"
  on rebar_bars
  using (
    exists (
      select 1 from rebar_elements re
      join projects p on p.id = re.project_id
      where re.id = rebar_bars.element_id
        and p.created_by = auth.uid()
    )
  );

-- ─── Verification query (should return 2 rows with no errors) ────────────────
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename in ('rebar_elements', 'rebar_bars')
order by tablename;
