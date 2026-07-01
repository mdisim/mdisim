-- ============================================================
-- 216: qb_quantity_attachments
-- Files (photos, PDFs, Excel, documents) attached to
-- measurement items or BOQ items as evidence.
-- ============================================================

CREATE TABLE qb_quantity_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES qb_projects(id) ON DELETE CASCADE,
  -- Optional links — at least one should be set
  mi_id           UUID REFERENCES qb_measurement_items(id) ON DELETE CASCADE,
  boq_item_id     UUID REFERENCES qb_boq_items(id) ON DELETE CASCADE,
  drawing_measurement_id UUID REFERENCES qb_drawing_measurements(id) ON DELETE CASCADE,
  -- File metadata
  file_path       TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL
                  CHECK (file_type IN ('photo','pdf','excel','word','dwg','other')),
  file_size       BIGINT,
  mime_type       TEXT,
  -- Display
  title           TEXT,
  description     TEXT,
  category        TEXT
                  CHECK (category IN ('site_photo','inspection','drawing','calculation','specification','correspondence','other'))
                  DEFAULT 'other',
  -- Metadata
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_qa_project    ON qb_quantity_attachments(project_id);
CREATE INDEX idx_qb_qa_mi         ON qb_quantity_attachments(mi_id);
CREATE INDEX idx_qb_qa_boq        ON qb_quantity_attachments(boq_item_id);
CREATE INDEX idx_qb_qa_dm         ON qb_quantity_attachments(drawing_measurement_id);

ALTER TABLE qb_quantity_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_project_owner" ON qb_quantity_attachments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM qb_projects p
    WHERE p.id = project_id AND p.user_id = auth.uid()
  ));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('qb-attachments', 'qb-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "qb_attach_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'qb-attachments' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "qb_attach_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'qb-attachments' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "qb_attach_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'qb-attachments' AND auth.uid() IS NOT NULL
  );
