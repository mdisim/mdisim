-- Payment Certificates
create table if not exists payment_certificates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  certificate_number varchar(50) not null,
  period_start date not null,
  period_end date not null,
  status varchar(30) not null default 'draft'
    check (status in ('draft','submitted','certified','paid')),
  total_certified numeric(15,2) not null default 0,
  retention_percent numeric(5,2) not null default 0,
  retention_amount numeric(15,2) not null default 0,
  net_payment numeric(15,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payment_certificates enable row level security;

drop policy if exists "payment_certificates_project_owner" on payment_certificates;
create policy "payment_certificates_project_owner" on payment_certificates
  using (exists (
    select 1 from projects where projects.id = payment_certificates.project_id
      and projects.created_by = auth.uid()
  ));

create table if not exists certificate_line_items (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references payment_certificates(id) on delete cascade,
  boq_item_id uuid references boq_items(id) on delete set null,
  description text not null,
  unit text,
  contract_quantity numeric(15,3),
  contract_rate numeric(15,4),
  prev_quantity numeric(15,3) not null default 0,
  curr_quantity numeric(15,3) not null default 0,
  total_quantity numeric(15,3) generated always as (prev_quantity + curr_quantity) stored,
  curr_amount numeric(15,2) generated always as ((curr_quantity) * contract_rate) stored,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

alter table certificate_line_items enable row level security;

drop policy if exists "cli_via_certificate" on certificate_line_items;
create policy "cli_via_certificate" on certificate_line_items
  using (exists (
    select 1 from payment_certificates pc
    join projects p on p.id = pc.project_id
    where pc.id = certificate_line_items.certificate_id
      and p.created_by = auth.uid()
  ));

create index if not exists idx_payment_certs_project on payment_certificates(project_id);
create index if not exists idx_cert_line_items_cert on certificate_line_items(certificate_id);
