-- Sprint 11B: Enhanced Takeoff System — 15 tool types, material specs, DXF support, measurement history

-- Enhance measurements table for all 15 tool types
ALTER TABLE drawing_measurements
  ADD COLUMN IF NOT EXISTS tool_type text DEFAULT 'length',
  ADD COLUMN IF NOT EXISTS material_spec jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS computed_quantity numeric(15,3),
  ADD COLUMN IF NOT EXISTS computed_unit text,
  ADD COLUMN IF NOT EXISTS boq_item_id uuid REFERENCES boq_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS color text DEFAULT '#f59e0b';

-- DXF file support flag on drawings
ALTER TABLE drawing_files
  ADD COLUMN IF NOT EXISTS file_type text DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS dxf_layers jsonb DEFAULT '[]';

-- Measurement history for AI training
CREATE TABLE IF NOT EXISTS measurement_history_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid REFERENCES drawing_measurements(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'created', 'edited', 'deleted', 'linked_to_boq'
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE measurement_history_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own project measurement history v2" ON measurement_history_v2;
CREATE POLICY "Users see own project measurement history v2" ON measurement_history_v2
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_measurement_history_v2_measurement ON measurement_history_v2(measurement_id);
CREATE INDEX IF NOT EXISTS idx_measurement_history_v2_project ON measurement_history_v2(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_measurements_tool_type ON drawing_measurements(tool_type);
