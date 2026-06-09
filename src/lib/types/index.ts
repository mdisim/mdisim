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
