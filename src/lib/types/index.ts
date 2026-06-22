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
  drawing_type: DrawingType
  revision: string | null
  file_path: string
  file_type: FileType
  file_size: number | null
  page_count: number
  created_at: string
  updated_at: string
}

export type DrawingType = 'architectural' | 'structural' | 'electrical' | 'mechanical' | 'other'
export type FileType = 'pdf' | 'dwg' | 'dxf' | 'png' | 'jpg' | 'jpeg'

export interface DrawingCalibration {
  id: string
  drawing_id: string
  page_number: number
  point1_x: number
  point1_y: number
  point2_x: number
  point2_y: number
  real_length: number
  unit: string
  scale_factor: number
  created_at: string
}

export interface MeasurementItem {
  id: string
  project_id: string
  user_id: string
  item_code: string | null
  description: string
  unit: string
  section: string | null
  drawing_ref: string | null
  location: string | null
  sort_order: number
  total_qty: number
  additions_qty: number
  deductions_qty: number
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
  count: number | null
  length: number | null
  width: number | null
  height: number | null
  formula: string | null
  is_deduction: boolean
  quantity: number
  notes: string | null
  drawing_id: string | null
  page_number: number | null
  points: unknown | null
  scale_used: number | null
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
  { value: 'other', label: 'Other' },
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
