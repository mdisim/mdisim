-- BOQ Templates System
-- Safe to run in Supabase SQL Editor.

-- ─── boq_templates ───────────────────────────────────────────────────────────
create table if not exists boq_templates (
  id                  uuid        primary key default gen_random_uuid(),
  company_id          uuid        references companies(id) on delete cascade,
  created_by          uuid        not null references auth.users(id) on delete cascade,
  name                text        not null,
  description         text,
  category            text,
  is_company_standard boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── boq_template_items ──────────────────────────────────────────────────────
create table if not exists boq_template_items (
  id                uuid        primary key default gen_random_uuid(),
  template_id       uuid        not null references boq_templates(id) on delete cascade,
  item_code         text,
  description       text        not null,
  unit              text        not null default 'm',
  unit_rate         numeric     not null default 0,
  category          text,
  sort_order        integer     not null default 0,
  is_section_header boolean     not null default false,
  notes             text
);

-- ─── Indices ─────────────────────────────────────────────────────────────────
create index if not exists boq_templates_company_id_idx    on boq_templates(company_id);
create index if not exists boq_template_items_template_idx on boq_template_items(template_id);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function update_boq_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists boq_templates_updated_at on boq_templates;
create trigger boq_templates_updated_at
  before update on boq_templates
  for each row execute function update_boq_templates_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────
alter table boq_templates      enable row level security;
alter table boq_template_items enable row level security;

-- Drop old policies if re-running
drop policy if exists "Users select boq_templates"  on boq_templates;
drop policy if exists "Users insert boq_templates"  on boq_templates;
drop policy if exists "Users update boq_templates"  on boq_templates;
drop policy if exists "Users delete boq_templates"  on boq_templates;
drop policy if exists "Users manage boq_template_items" on boq_template_items;

-- SELECT: own templates OR same-company templates OR company-standard templates
create policy "Users select boq_templates"
  on boq_templates for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.company_id = boq_templates.company_id
    )
    or is_company_standard = true
  );

-- INSERT: only own templates
create policy "Users insert boq_templates"
  on boq_templates for insert
  with check (created_by = auth.uid());

-- UPDATE: only own templates
create policy "Users update boq_templates"
  on boq_templates for update
  using (created_by = auth.uid());

-- DELETE: only own templates
create policy "Users delete boq_templates"
  on boq_templates for delete
  using (created_by = auth.uid());

-- Template items: follow parent template access
create policy "Users manage boq_template_items"
  on boq_template_items
  using (
    exists (
      select 1 from boq_templates
      where boq_templates.id = boq_template_items.template_id
        and (
          boq_templates.created_by = auth.uid()
          or exists (
            select 1 from profiles
            where profiles.id = auth.uid()
              and profiles.company_id = boq_templates.company_id
          )
          or boq_templates.is_company_standard = true
        )
    )
  )
  with check (
    exists (
      select 1 from boq_templates
      where boq_templates.id = boq_template_items.template_id
        and boq_templates.created_by = auth.uid()
    )
  );
