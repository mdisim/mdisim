-- Migration 214: Add WITH CHECK clauses to all RLS policies from migrations 209-213
-- Without WITH CHECK, INSERT/UPDATE operations bypass RLS even though SELECT is protected.
-- WITH CHECK must match the USING condition for each policy.

-- 209: Rate Analysis
DROP POLICY IF EXISTS rate_analyses_via_project ON qb_rate_analyses;
CREATE POLICY rate_analyses_via_project ON qb_rate_analyses FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_rate_analyses.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_rate_analyses.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS rate_resources_via_project ON qb_rate_resources;
CREATE POLICY rate_resources_via_project ON qb_rate_resources FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_rate_analyses ra JOIN projects p ON p.id = ra.project_id WHERE ra.id = qb_rate_resources.rate_analysis_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_rate_analyses ra JOIN projects p ON p.id = ra.project_id WHERE ra.id = qb_rate_resources.rate_analysis_id AND p.created_by = auth.uid()));

-- 210: Tenders
DROP POLICY IF EXISTS tenders_via_project ON qb_tenders;
CREATE POLICY tenders_via_project ON qb_tenders FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_tenders.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_tenders.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS bidders_via_project ON qb_tender_bidders;
CREATE POLICY bidders_via_project ON qb_tender_bidders FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bidders.tender_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bidders.tender_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS bids_via_project ON qb_tender_bids;
CREATE POLICY bids_via_project ON qb_tender_bids FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bids.tender_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_tenders t JOIN projects p ON p.id = t.project_id WHERE t.id = qb_tender_bids.tender_id AND p.created_by = auth.uid()));

-- 211: Cost Control
DROP POLICY IF EXISTS contracts_via_project ON qb_contracts;
CREATE POLICY contracts_via_project ON qb_contracts FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_contracts.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_contracts.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS variations_via_project ON qb_variations;
CREATE POLICY variations_via_project ON qb_variations FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_variations.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_variations.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS variation_items_via_project ON qb_variation_items;
CREATE POLICY variation_items_via_project ON qb_variation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_variations v JOIN projects p ON p.id = v.project_id WHERE v.id = qb_variation_items.variation_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_variations v JOIN projects p ON p.id = v.project_id WHERE v.id = qb_variation_items.variation_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cost_entries_via_project ON qb_cost_entries;
CREATE POLICY cost_entries_via_project ON qb_cost_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cost_entries.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cost_entries.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cashflow_via_project ON qb_cashflow;
CREATE POLICY cashflow_via_project ON qb_cashflow FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cashflow.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_cashflow.project_id AND p.created_by = auth.uid()));

-- 212: Payments
DROP POLICY IF EXISTS certs_via_project ON qb_payment_certs;
CREATE POLICY certs_via_project ON qb_payment_certs FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_payment_certs.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_payment_certs.project_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS cert_lines_via_project ON qb_payment_lines;
CREATE POLICY cert_lines_via_project ON qb_payment_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_payment_certs c JOIN projects p ON p.id = c.project_id WHERE c.id = qb_payment_lines.cert_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_payment_certs c JOIN projects p ON p.id = c.project_id WHERE c.id = qb_payment_lines.cert_id AND p.created_by = auth.uid()));

-- 213: Drawing Revisions
DROP POLICY IF EXISTS revisions_via_drawing ON qb_drawing_revisions;
CREATE POLICY revisions_via_drawing ON qb_drawing_revisions FOR ALL
  USING (EXISTS (SELECT 1 FROM qb_drawings d JOIN projects p ON p.id = d.project_id WHERE d.id = qb_drawing_revisions.drawing_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM qb_drawings d JOIN projects p ON p.id = d.project_id WHERE d.id = qb_drawing_revisions.drawing_id AND p.created_by = auth.uid()));

DROP POLICY IF EXISTS qty_changes_via_project ON qb_quantity_changes;
CREATE POLICY qty_changes_via_project ON qb_quantity_changes FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_quantity_changes.project_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = qb_quantity_changes.project_id AND p.created_by = auth.uid()));
