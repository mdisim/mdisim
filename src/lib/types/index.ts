export interface Company {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  registration_number: string | null
  vat_number: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id: string | null
  full_name: string | null
  role: string | null
  account_type: AccountType | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed'
  start_date: string | null
  end_date: string | null
  budget: number
  location: string | null
  client_name: string | null
  created_at: string
  updated_at: string
  created_by: string
  company_id: string
}

export interface BOQItem {
  id: string
  project_id: string
  item_code: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
  total_amount: number
  category: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CostEntry {
  id: string
  project_id: string
  boq_item_id: string | null
  description: string
  amount: number
  cost_date: string
  category: string
  invoice_number: string | null
  vendor: string | null
  status: 'pending' | 'approved' | 'paid'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contractor {
  id: string
  user_id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  specialty: string | null
  license_number: string | null
  created_at: string
  updated_at: string
}

export interface ContractorPayment {
  id: string
  project_id: string
  contractor_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  description: string | null
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  contractor?: Contractor
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  total_budget: number
  total_spent: number
  total_contractors: number
  pending_payments: number
}

// ============================================
// SITE DAILY REPORTS
// ============================================
export type WeatherType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'foggy'
export type WorkStatus = 'normal' | 'delayed' | 'suspended' | 'holiday'
export type ReportStatus = 'draft' | 'submitted' | 'approved'
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IssueType = 'safety' | 'quality' | 'delay' | 'rfi' | 'instruction' | 'other'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SiteDailyReport {
  id: string
  project_id: string
  report_date: string
  created_by: string
  weather: WeatherType | null
  temperature_high: number | null
  temperature_low: number | null
  work_status: WorkStatus
  delay_reason: string | null
  general_notes: string | null
  status: ReportStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface SDRWorkforce {
  id: string
  report_id: string
  trade: string
  contractor_id: string | null
  planned_count: number
  actual_count: number
  overtime_hours: number
  notes: string | null
  created_at: string
  contractor?: { name: string; company: string | null }
}

export interface SDREquipment {
  id: string
  report_id: string
  equipment_name: string
  equipment_type: string | null
  quantity: number
  hours_used: number
  idle_hours: number
  operator_name: string | null
  notes: string | null
  created_at: string
}

export interface SDRActivity {
  id: string
  report_id: string
  boq_item_id: string | null
  description: string
  location_on_site: string | null
  unit: string | null
  quantity_done: number
  notes: string | null
  created_at: string
  boq_item?: { item_code: string; description: string }
}

export interface SDRIssue {
  id: string
  report_id: string
  issue_type: IssueType | null
  description: string
  severity: IssueSeverity
  raised_by: string | null
  status: IssueStatus
  resolution_notes: string | null
  created_at: string
}

// ============================================
// QUANTITY TAKEOFF SYSTEM
// ============================================
export type MeasurementType = 'length' | 'area' | 'rectangle' | 'count' | 'highlight' | 'text'
export type ToolType = 'select' | 'calibrate' | 'length' | 'area' | 'rectangle' | 'count' | 'highlight' | 'text' | 'pan'

export interface Point {
  x: number
  y: number
}

export interface DrawingFile {
  id: string
  project_id: string
  name: string
  original_filename: string
  storage_path: string
  file_size_bytes: number | null
  page_count: number
  status: 'processing' | 'ready' | 'error'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DrawingCalibration {
  id: string
  drawing_id: string
  page_number: number
  pixels_distance: number
  real_distance: number
  real_unit: string
  scale_factor: number
  created_at: string
  updated_at: string
}

export interface DrawingMeasurement {
  id: string
  drawing_id: string
  boq_item_id: string | null
  page_number: number
  label: string | null
  measurement_type: MeasurementType
  points: Point[]
  color: string
  real_value: number | null
  unit: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  boq_item?: { item_code: string; description: string; unit: string }
}

export interface DrawingLayer {
  id: string
  drawing_id: string
  name: string
  discipline: string
  color: string
  is_visible: boolean
  sort_order: number
  created_at: string
}

export interface MeasurementHistory {
  id: string
  measurement_id: string
  changed_by: string | null
  change_type: 'created' | 'updated' | 'linked' | 'unlinked'
  previous_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  changed_at: string
}

export interface MeasurementTemplate {
  id: string
  name: string
  discipline: string
  tool: MeasurementType
  color: string
  unit: string
  defaultLabel: string
}

export interface PaymentCertificate {
  id: string
  project_id: string
  certificate_number: string
  period_start: string
  period_end: string
  status: 'draft' | 'submitted' | 'certified' | 'paid'
  total_certified: number
  retention_percent: number
  retention_amount: number
  net_payment: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  progress_percent: number
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectMilestone {
  id: string
  project_id: string
  phase_id: string | null
  name: string
  due_date: string | null
  completed_date: string | null
  status: 'pending' | 'completed' | 'missed'
  notes: string | null
  created_at: string
}

export interface BOQLibraryItem {
  id: string
  company_id: string | null
  item_code: string
  description: string
  unit: string
  unit_rate: number
  category: string | null
  trade: string | null
  is_global: boolean
  created_at: string
}

export interface Variation {
  id: string
  project_id: string
  variation_number: string
  title: string
  description: string | null
  type: 'addition' | 'omission' | 'substitution' | 'provisional'
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  amount: number
  approved_amount: number | null
  submitted_date: string | null
  approved_date: string | null
  raised_by: string | null
  approved_by: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MaterialDelivery {
  id: string
  project_id: string
  material_name: string
  category: string | null
  quantity: number
  unit: string
  delivery_date: string
  supplier: string | null
  delivery_note_number: string | null
  received_by: string | null
  location_on_site: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  approval_status: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
}

export interface ConcretePour {
  id: string
  project_id: string
  pour_date: string
  element_type: string
  location: string | null
  mix_design: string | null
  volume_m3: number
  strength_mpa: number | null
  supplier: string | null
  batch_numbers: string | null
  slump_mm: number | null
  temp_celsius: number | null
  test_cubes: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ProjectDocument {
  id: string
  project_id: string
  title: string
  document_type: 'drawing' | 'specification' | 'report' | 'contract' | 'other'
  revision: string | null
  status: 'current' | 'superseded' | 'draft'
  file_url: string | null
  uploaded_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================
// SPRINT 4 TYPES
// ============================================
export interface Tender {
  id: string
  company_id: string | null
  title: string
  description: string | null
  client_name: string | null
  tender_number: string | null
  issue_date: string | null
  submission_deadline: string | null
  status: string
  estimated_value: number
  submitted_value: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TenderItem {
  id: string
  tender_id: string
  boq_item_id: string | null
  description: string
  unit: string | null
  quantity: number
  unit_rate: number
  total_amount: number
  sort_order: number
  created_at: string
  boq_item?: { item_code: string; description: string; unit: string } | null
}

export interface ProjectContract {
  id: string
  project_id: string
  contractor_id: string | null
  title: string
  contract_number: string | null
  contract_type: string
  value: number
  start_date: string | null
  end_date: string | null
  status: string
  retention_percent: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  contractor?: { name: string; company: string | null }
}

export interface PurchaseOrder {
  id: string
  project_id: string
  po_number: string
  supplier: string
  description: string | null
  category: string | null
  quantity: number
  unit: string | null
  unit_price: number
  total_amount: number
  order_date: string | null
  expected_delivery: string | null
  actual_delivery: string | null
  status: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================
// SPRINT 6 TYPES
// ============================================
export interface ProjectRisk {
  id: string
  project_id: string
  title: string
  description: string | null
  category: string
  probability: string
  impact: string
  risk_score: number
  mitigation: string | null
  owner: string | null
  status: string
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectIssue {
  id: string
  project_id: string
  issue_number: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  raised_by: string | null
  assigned_to: string | null
  due_date: string | null
  resolved_date: string | null
  resolution_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MeetingMinutes {
  id: string
  project_id: string
  meeting_date: string
  meeting_type: string
  location: string | null
  attendees: string | null
  agenda: string | null
  minutes: string | null
  action_items: string | null
  next_meeting_date: string | null
  chaired_by: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================
// SPRINT 8A TYPES
// ============================================
export type UserRole = 'super_admin' | 'company_admin' | 'project_manager' | 'quantity_surveyor' | 'site_engineer' | 'viewer'

export type AccountType = 'student' | 'engineer' | 'company'

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface TeamInvitation {
  id: string
  company_id: string
  email: string
  role: string
  invited_by: string | null
  token: string
  status: string | null
  expires_at: string
  created_at: string
}

// ============================================
// SPRINT 8B TYPES
// ============================================
export interface ProjectCorrespondence {
  id: string
  project_id: string
  reference_number: string
  subject: string
  direction: string
  correspondent: string | null
  letter_date: string | null
  received_date: string | null
  category: string
  status: string
  summary: string | null
  action_required: string | null
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DocumentRevision {
  id: string
  document_id: string
  revision: string
  status: string
  notes: string | null
  reviewed_by: string | null
  approved_by: string | null
  approved_date: string | null
  created_by: string | null
  created_at: string
}

export interface ReinforcementRecord {
  id: string
  project_id: string
  record_date: string
  element_type: string
  location: string | null
  bar_diameter_mm: number | null
  steel_grade: string | null
  quantity_kg: number | null
  quantity_tonnes: number | null
  supplier: string | null
  heat_number: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}
