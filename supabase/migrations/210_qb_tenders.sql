-- ============================================================
-- 210: Tender Management
-- Multi-bidder tender comparison with variance analysis
-- ============================================================

-- Tender packages (one per tender exercise)
CREATE TABLE qb_tenders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  tender_number text,
  issue_date    date,
  closing_date  date,
  status        text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','closed','awarded','cancelled')),
  awarded_bidder_id uuid,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Bidders
CREATE TABLE qb_tender_bidders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id   uuid NOT NULL REFERENCES qb_tenders(id) ON DELETE CASCADE,
  name        text NOT NULL,
  company     text,
  email       text,
  phone       text,
  submission_date date,
  status      text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','submitted','disqualified','awarded')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Update awarded_bidder FK
ALTER TABLE qb_tenders
  ADD CONSTRAINT qb_tenders_awarded_fk
  FOREIGN KEY (awarded_bidder_id) REFERENCES qb_tender_bidders(id) ON DELETE SET NULL;

-- Bid line items (one per BOQ item per bidder)
CREATE TABLE qb_tender_bids (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id    uuid NOT NULL REFERENCES qb_tenders(id) ON DELETE CASCADE,
  bidder_id    uuid NOT NULL REFERENCES qb_tender_bidders(id) ON DELETE CASCADE,
  boq_item_id  uuid REFERENCES qb_boq_items(id) ON DELETE SET NULL,
  description  text NOT NULL,
  unit         text NOT NULL DEFAULT 'nr',
  quantity     numeric NOT NULL DEFAULT 0,
  unit_rate    numeric NOT NULL DEFAULT 0,
  amount       numeric GENERATED ALWAYS AS (quantity * unit_rate) STORED,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE qb_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_tender_bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_tender_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenders_via_project ON qb_tenders FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_tenders.project_id AND p.created_by = auth.uid())
);
CREATE POLICY bidders_via_project ON qb_tender_bidders FOR ALL USING (
  EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id
          WHERE t.id = qb_tender_bidders.tender_id AND p.created_by = auth.uid())
);
CREATE POLICY bids_via_project ON qb_tender_bids FOR ALL USING (
  EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id
          WHERE t.id = qb_tender_bids.tender_id AND p.created_by = auth.uid())
);

CREATE INDEX idx_qb_tenders_project ON qb_tenders(project_id);
CREATE INDEX idx_qb_bidders_tender ON qb_tender_bidders(tender_id);
CREATE INDEX idx_qb_bids_tender ON qb_tender_bids(tender_id);
CREATE INDEX idx_qb_bids_bidder ON qb_tender_bids(bidder_id);
