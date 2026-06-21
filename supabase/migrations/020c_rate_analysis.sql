-- Rate Analysis System (BOQ item rate breakdown)
-- Safe to run in Supabase SQL Editor.
-- Uses projects.created_by = auth.uid() — the RLS pattern in this codebase.

-- ─── Table ──────────────────────────────────────────────────────────────────
create table if not exists rate_analysis_items (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id) on delete cascade,
  boq_item_id     uuid        not null references boq_items(id) on delete cascade,
  component_type  text        not null check (component_type in ('material', 'labor', 'equipment', 'subcontractor', 'overhead', 'profit')),
  description     text        not null,
  unit            text        default 'ls',
  quantity        numeric(15,4) default 1,
  rate            numeric(15,4) default 0,
  amount          numeric(15,4) default 0,
  sort_order      integer     default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Indices ────────────────────────────────────────────────────────────────
create index if not exists rate_analysis_items_project_id_idx
  on rate_analysis_items(project_id);
create index if not exists rate_analysis_items_boq_item_id_idx
  on rate_analysis_items(boq_item_id);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function update_rate_analysis_items_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rate_analysis_items_updated_at on rate_analysis_items;
create trigger rate_analysis_items_updated_at
  before update on rate_analysis_items
  for each row execute function update_rate_analysis_items_updated_at();

-- ─── Row-Level Security ─────────────────────────────────────────────────────
alter table rate_analysis_items enable row level security;

drop policy if exists "Users manage own rate analysis items" on rate_analysis_items;

create policy "Users manage own rate analysis items"
  on rate_analysis_items
  using (
    exists (
      select 1 from projects
      where projects.id = rate_analysis_items.project_id
        and projects.created_by = auth.uid()
    )
  );

-- ─── Verification query (should return 1 row with no errors) ────────────────
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename = 'rate_analysis_items'
order by tablename;
