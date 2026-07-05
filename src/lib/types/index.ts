// ── Core types for Measurement Book + BOQ + Pricing system ──────────────

export interface Project {
  id: string
  company_id: string | null
  created_by: string
  name: string
  client_name: string | null
  location: string | null
  description: string | null
  category: string | null
  budget: number | null
  start_date: string | null
  end_date: string | null
  status: string | null
  progress: number | null
  currency: string
  created_at: string
  updated_at: string
}

export interface Drawing {
  id: string
  project_id: string
  user_id: string
  name: string
  drawing_number: string | null
  drawing_type: DrawingType
  revision_number: string | null
  revision_date: string | null
  revision_notes: string | null
  file_path: string
  file_type: FileType
  file_size: number | null
  page_count: number
  created_at: string
  updated_at: string
}

export type DrawingType = 'architectural' | 'structural' | 'electrical' | 'mechanical' | 'plumbing' | 'civil' | 'landscape' | 'other'
export type FileType = 'pdf' | 'dwg' | 'dxf' | 'png' | 'jpg' | 'jpeg'

export interface DrawingScale {
  id: string
  drawing_id: string
  page_number: number
  label: string | null
  pt1_x: number
  pt1_y: number
  pt2_x: number
  pt2_y: number
  real_length: number
  unit: string
  px_per_unit: number
  created_at: string
}

export type DrawingToolType = 'line' | 'polyline' | 'area' | 'rectangle' | 'circle' | 'count'

export interface DrawingMeasurement {
  id: string
  drawing_id: string
  page_number: number
  scale_id: string | null
  tool_type: DrawingToolType
  coordinates: unknown
  quantity: number
  unit: string | null
  label: string | null
  color: string | null
  notes: string | null
  ocr_source: string | null
  ocr_confidence: number | null
  ocr_text: string | null
  created_at: string
  updated_at: string
}

export type MeasurementType = 'length' | 'area' | 'volume' | 'count' | 'weight' | 'formula'

export interface MeasurementItem {
  id: string
  project_id: string
  item_code: string | null
  description: string
  unit: string
  measurement_type: MeasurementType
  section: string | null
  drawing_ref: string | null
  location: string | null
  sort_order: number
  additions_qty: number
  deductions_qty: number
  net_qty: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  lines?: MeasurementLine[]
}

export interface MeasurementLine {
  id: string
  item_id: string
  line_number: number
  description: string | null
  location: string | null
  nr: number | null
  length: number | null
  width: number | null
  height: number | null
  formula: string | null
  is_deduction: boolean
  quantity: number
  notes: string | null
  drawing_id: string | null
  page_number: number | null
  drawing_measurement_id: string | null
  geo_json: unknown | null
  scale_id: string | null
  ocr_source: string | null
  ocr_confidence: number | null
  ocr_text: string | null
  floor_level: string | null
  engineer_name: string | null
  measured_date: string | null
  revision_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BOQItem {
  id: string
  project_id: string
  mi_id: string | null
  library_item_id: string | null
  code: string | null
  description: string
  unit: string
  quantity: number
  original_quantity: number | null
  revised_quantity: number | null
  quantity_difference: number | null
  unit_rate: number | null
  material_rate: number | null
  labor_rate: number | null
  equipment_rate: number | null
  total_amount: number | null
  section: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface LibraryCategory {
  id: string
  user_id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface LibraryItem {
  id: string
  category_id: string | null
  user_id: string
  code: string | null
  description: string
  unit: string
  default_rate: number | null
  material_rate: number | null
  labor_rate: number | null
  equipment_rate: number | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

// ── Rate Analysis types ─────────────────────────────────────────────────

export type ResourceType = 'material' | 'labor' | 'equipment' | 'subcontractor'

export const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontractor', label: 'Subcontractor' },
]

export interface RateAnalysis {
  id: string
  project_id: string | null
  boq_item_id: string | null
  library_item_id: string | null
  description: string
  unit: string
  output_qty: number
  overhead_pct: number
  profit_pct: number
  material_total: number
  labor_total: number
  equipment_total: number
  subcon_total: number
  direct_cost: number
  overhead_amount: number
  profit_amount: number
  unit_rate: number
  created_at: string
  updated_at: string
  resources?: RateResource[]
}

export interface RateResource {
  id: string
  rate_analysis_id: string
  resource_type: ResourceType
  description: string
  unit: string
  quantity: number
  unit_cost: number
  amount: number
  waste_pct: number
  total_amount: number
  sort_order: number
  created_at: string
}

// ── Tender Management types ──────────────────────────────────────────────

export type TenderStatus = 'draft' | 'issued' | 'closed' | 'awarded' | 'cancelled'
export type BidderStatus = 'invited' | 'submitted' | 'disqualified' | 'awarded'

export interface Tender {
  id: string
  project_id: string
  title: string
  description: string | null
  tender_number: string | null
  issue_date: string | null
  closing_date: string | null
  status: TenderStatus
  awarded_bidder_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  bidders?: TenderBidder[]
}

export interface TenderBidder {
  id: string
  tender_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  submission_date: string | null
  status: BidderStatus
  notes: string | null
  created_at: string
  bids?: TenderBid[]
}

export interface TenderBid {
  id: string
  tender_id: string
  bidder_id: string
  boq_item_id: string | null
  description: string
  unit: string
  quantity: number
  unit_rate: number
  amount: number
  notes: string | null
  created_at: string
}

// ── Cost Control types ──────────────────────────────────────────────────

export type VariationStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'withdrawn'
export type VariationType = 'addition' | 'omission' | 'substitution'
export type CostCategory = 'actual' | 'committed' | 'forecast'
export type CostType = 'direct' | 'indirect' | 'material' | 'labor' | 'equipment' | 'subcontractor' | 'overhead' | 'other'

export interface Contract {
  id: string
  project_id: string
  contract_value: number
  contingency_pct: number
  retention_pct: number
  advance_pct: number
  vat_pct: number
  start_date: string | null
  end_date: string | null
  duration_months: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Variation {
  id: string
  project_id: string
  variation_no: string
  title: string
  description: string | null
  status: VariationStatus
  variation_type: VariationType
  submitted_date: string | null
  approved_date: string | null
  amount: number
  approved_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  items?: VariationItem[]
}

export interface VariationItem {
  id: string
  variation_id: string
  boq_item_id: string | null
  description: string
  unit: string
  quantity: number
  unit_rate: number
  amount: number
  sort_order: number
  created_at: string
}

export interface CostEntry {
  id: string
  project_id: string
  period_date: string
  category: CostCategory
  cost_type: CostType
  description: string
  amount: number
  boq_item_id: string | null
  notes: string | null
  created_at: string
}

export interface CashflowEntry {
  id: string
  project_id: string
  period_date: string
  planned_income: number
  actual_income: number
  planned_expense: number
  actual_expense: number
  cumulative_planned_income: number
  cumulative_actual_income: number
  cumulative_planned_expense: number
  cumulative_actual_expense: number
  notes: string | null
  created_at: string
}

// ── Payment Certificate types ───────────────────────────────────────────

export type PaymentCertStatus = 'draft' | 'submitted' | 'checked' | 'approved' | 'paid'

export interface PaymentCert {
  id: string
  project_id: string
  cert_number: number
  period_from: string
  period_to: string
  status: PaymentCertStatus
  gross_amount: number
  previous_gross: number
  current_gross: number
  variations_amount: number
  retention_pct: number
  retention_amount: number
  previous_retention: number
  current_retention: number
  advance_recovery: number
  previous_advance_recovery: number
  current_advance_recovery: number
  vat_pct: number
  vat_amount: number
  net_payable: number
  submitted_date: string | null
  approved_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  lines?: PaymentLine[]
}

export interface PaymentLine {
  id: string
  cert_id: string
  boq_item_id: string | null
  description: string
  unit: string
  contract_qty: number
  contract_rate: number
  contract_amount: number
  previous_qty: number
  previous_amount: number
  current_qty: number
  current_amount: number
  cumulative_qty: number
  cumulative_amount: number
  sort_order: number
  created_at: string
}

// ── Drawing Revision types ──────────────────────────────────────────────

export type RevisionStatus = 'superseded' | 'current' | 'draft'
export type QuantityChangeType = 'revision' | 'correction' | 'variation' | 'remeasurement'

export interface DrawingRevision {
  id: string
  drawing_id: string
  revision_number: string
  revision_date: string
  description: string | null
  file_path: string | null
  file_size: number | null
  status: RevisionStatus
  created_at: string
}

export interface QuantityChange {
  id: string
  project_id: string
  drawing_id: string | null
  from_revision_id: string | null
  to_revision_id: string | null
  boq_item_id: string | null
  mi_id: string | null
  description: string
  previous_qty: number
  new_qty: number
  difference: number
  unit: string
  change_type: QuantityChangeType
  notes: string | null
  created_at: string
}

// ── Quantity Attachments ────────────────────────────────────────────────

export type AttachmentFileType = 'photo' | 'pdf' | 'excel' | 'word' | 'dwg' | 'other'
export type AttachmentCategory = 'site_photo' | 'inspection' | 'drawing' | 'calculation' | 'specification' | 'correspondence' | 'other'

export interface QuantityAttachment {
  id: string
  project_id: string
  mi_id: string | null
  boq_item_id: string | null
  drawing_measurement_id: string | null
  file_path: string
  file_name: string
  file_type: AttachmentFileType
  file_size: number | null
  mime_type: string | null
  title: string | null
  description: string | null
  category: AttachmentCategory
  uploaded_by: string | null
  created_at: string
}

// ── Measurement Sketches ────────────────────────────────────────────────

export type SketchSnapshotType = 'auto' | 'manual'

export interface MeasurementSketch {
  id: string
  project_id: string
  drawing_id: string | null
  drawing_measurement_id: string | null
  mi_id: string | null
  file_path: string | null
  quantity: number | null
  unit: string | null
  formula: string | null
  scale_label: string | null
  page_number: number | null
  drawing_name: string | null
  drawing_number: string | null
  revision_number: string | null
  drawing_ref: string | null
  notes: string | null
  snapshot_type: SketchSnapshotType
  line_id: string | null
  created_at: string
}

// ── Quantity Approvals ──────────────────────────────────────────────────

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export interface QuantityApproval {
  id: string
  project_id: string
  boq_item_id: string
  mi_id: string | null
  calculated_quantity: number
  approved_quantity: number
  unit: string
  status: ApprovalStatus
  approver_name: string | null
  approver_id: string | null
  approved_at: string
  notes: string | null
  created_at: string
}

// ── Auth / profile types ────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  company_id: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}


// ── Constants ───────────────────────────────────────────────────────────

export const DRAWING_TYPES: { value: DrawingType; label: string }[] = [
  { value: 'architectural', label: 'Architectural' },
  { value: 'structural', label: 'Structural' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'civil', label: 'Civil' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'other', label: 'Other' },
]

export const MEASUREMENT_TYPES: { value: MeasurementType; label: string }[] = [
  { value: 'length', label: 'Length' },
  { value: 'area', label: 'Area' },
  { value: 'volume', label: 'Volume' },
  { value: 'count', label: 'Count' },
  { value: 'weight', label: 'Weight' },
  { value: 'formula', label: 'Formula' },
]

export const MEASUREMENT_UNITS: { value: string; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
  { value: 'nr', label: 'nr' },
  { value: 'ls', label: 'LS' },
  { value: 'lm', label: 'LM' },
  { value: 'cm', label: 'cm' },
  { value: 'mm', label: 'mm' },
]
