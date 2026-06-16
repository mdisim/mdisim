create table if not exists tender_items (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references tenders(id) on delete cascade not null,
  boq_item_id uuid references boq_items(id) on delete set null,
  description text not null,
  unit text,
  quantity numeric(15,4) default 0,
  unit_rate numeric(15,4) default 0,
  total_amount numeric(15,4) generated always as (quantity * unit_rate) stored,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table tender_items enable row level security;
create policy "Users manage own tender items" on tender_items
  using (exists (select 1 from tenders t join projects p on t.project_id = p.id where t.id = tender_id and p.created_by = auth.uid()));
