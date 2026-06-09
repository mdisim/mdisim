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
  user_id: string
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
