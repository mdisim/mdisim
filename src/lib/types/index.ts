// ── Core types for Measurement Book + BOQ + Pricing system ──────────────

export interface Project {
  id: string
  user_id: string
  name: string
  client_name: string | null
  location: string | null
  currency: string
  vat_pct: number
  notes: string | null
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

export type AccountType = 'student' | 'engineer' | 'company'

export function accountTypeToRole(accountType: AccountType): string {
  if (accountType === 'student') return 'student'
  if (accountType === 'engineer') return 'engineer'
  return 'company_admin'
}

export function roleToAccountType(role: string | null): AccountType | null {
  if (!role) return null
  if (role === 'student') return 'student'
  if (role === 'engineer') return 'engineer'
  const companyRoles = ['super_admin', 'company_admin', 'project_manager', 'quantity_surveyor', 'site_engineer', 'viewer']
  if (companyRoles.includes(role)) return 'company'
  return null
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
