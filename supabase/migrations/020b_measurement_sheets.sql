-- Measurement Sheet System (QS dimension paper)
-- Safe to run in Supabase SQL Editor.
-- Uses projects.created_by = auth.uid() — the RLS pattern in this codebase.

-- ─── Entries ─────────────────────────────────────────────────────────────────
create table if not exists measurement_sheet_entries (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id) on delete cascade,
  boq_item_id  uuid        references boq_items(id) on delete set null,
  description  text,
  reference    text,
  nr           integer     not null default 1,
  length       numeric(15,4),
  width        numeric(15,4),
  height       numeric(15,4),
  quantity     numeric(15,4),
  unit         text        not null default 'm',
  notes        text,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Indices ─────────────────────────────────────────────────────────────────
create index if not exists measurement_sheet_entries_project_id_idx
  on measurement_sheet_entries(project_id);
create index if not exists measurement_sheet_entries_boq_item_id_idx
  on measurement_sheet_entries(boq_item_id);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function update_measurement_sheet_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists measurement_sheet_entries_updated_at on measurement_sheet_entries;
create trigger measurement_sheet_entries_updated_at
  before update on measurement_sheet_entries
  for each row execute function update_measurement_sheet_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
alter table measurement_sheet_entries enable row level security;

drop policy if exists "Users manage own measurement sheet entries" on measurement_sheet_entries;

create policy "Users manage own measurement sheet entries"
  on measurement_sheet_entries
  using (
    exists (
      select 1 from projects
      where projects.id = measurement_sheet_entries.project_id
        and projects.created_by = auth.uid()
    )
  );

-- ─── Verification query (should return 1 row with no errors) ────────────────
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where tablename = 'measurement_sheet_entries'
order by tablename;
