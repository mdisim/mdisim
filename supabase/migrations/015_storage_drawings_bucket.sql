-- Create the 'drawings' storage bucket for takeoff PDF/DXF uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drawings',
  'drawings',
  false,
  52428800,  -- 50 MB
  array['application/pdf', 'application/octet-stream', 'image/vnd.dxf', 'application/dxf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS: authenticated users can upload to their own folder
create policy "Users upload own drawings"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can read/download their own drawings
create policy "Users read own drawings"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can delete their own drawings
create policy "Users delete own drawings"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
