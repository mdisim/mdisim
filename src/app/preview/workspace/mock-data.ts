import type {
  Project, Drawing, MeasurementItem, BOQItem, LibraryCategory, LibraryItem,
  Contract, RateAnalysis, PaymentCert,
} from '@/lib/types'
import type { WorkspaceData } from '@/components/workspace/workspace-context'

const now = new Date().toISOString()

export const mockProject: Project = {
  id: 'preview-project',
  company_id: null,
  created_by: 'preview-user',
  name: 'Villa Complex — Building A',
  client_name: 'Al Noor Holdings',
  location: 'Amman, Jordan',
  description: null,
  category: 'residential',
  budget: 1_250_000,
  start_date: '2026-01-01',
  end_date: '2026-12-01',
  status: 'active',
  progress: 42,
  currency: 'JOD',
  created_at: now,
  updated_at: now,
}

const drawings: Drawing[] = [
  { id: 'dwg-1', project_id: mockProject.id, user_id: 'u', name: 'Foundation Plan', drawing_number: 'S-201', drawing_type: 'structural', revision_number: 'C', revision_date: '2026-05-01', revision_notes: null, file_path: 'preview/s-201.pdf', file_type: 'pdf', file_size: 120000, page_count: 1, created_at: now, updated_at: now },
  { id: 'dwg-2', project_id: mockProject.id, user_id: 'u', name: 'First Floor Slab', drawing_number: 'S-202', drawing_type: 'structural', revision_number: 'B', revision_date: '2026-04-12', revision_notes: null, file_path: 'preview/s-202.pdf', file_type: 'pdf', file_size: 110000, page_count: 1, created_at: now, updated_at: now },
  { id: 'dwg-3', project_id: mockProject.id, user_id: 'u', name: 'Ground Floor Plan', drawing_number: 'A-101', drawing_type: 'architectural', revision_number: 'C', revision_date: '2026-05-10', revision_notes: null, file_path: 'preview/a-101.pdf', file_type: 'pdf', file_size: 98000, page_count: 1, created_at: now, updated_at: now },
]

const measurementItems: MeasurementItem[] = [
  {
    id: 'mi-1', project_id: mockProject.id, item_code: '2.10', description: 'RC suspended slab, 200mm thick, grade C25/30',
    unit: 'm³', measurement_type: 'volume', section: 'Ground Floor — Slabs', drawing_ref: 'S-202', location: null, sort_order: 1,
    additions_qty: 10.42, deductions_qty: 0.22, net_qty: 10.2, created_by: 'u', updated_by: null, created_at: now, updated_at: now,
    lines: [
      { id: 'ml-1', item_id: 'mi-1', line_number: 1, description: 'Slab panel SLAB-04', location: 'GF', nr: 1, length: 6.9, width: 4.46, height: 0.2, formula: null, is_deduction: false, quantity: 6.16, notes: null, drawing_id: 'dwg-2', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 1, created_at: now, updated_at: now },
      { id: 'ml-2', item_id: 'mi-1', line_number: 2, description: 'Slab panel SLAB-05', location: 'GF', nr: 1, length: 5.2, width: 4.1, height: 0.2, formula: null, is_deduction: false, quantity: 4.26, notes: null, drawing_id: 'dwg-2', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 2, created_at: now, updated_at: now },
      { id: 'ml-3', item_id: 'mi-1', line_number: 3, description: 'Deduct: stair opening', location: 'GF', nr: 1, length: 1.2, width: 0.9, height: 0.2, formula: null, is_deduction: true, quantity: 0.22, notes: null, drawing_id: 'dwg-2', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 3, created_at: now, updated_at: now },
    ],
  },
  {
    id: 'mi-2', project_id: mockProject.id, item_code: '2.20', description: 'RC column 400×400, grade C25/30',
    unit: 'm³', measurement_type: 'volume', section: 'Ground Floor — Columns', drawing_ref: 'S-201', location: null, sort_order: 2,
    additions_qty: 4.1, deductions_qty: 0, net_qty: 4.1, created_by: 'u', updated_by: null, created_at: now, updated_at: now,
    lines: [
      { id: 'ml-4', item_id: 'mi-2', line_number: 1, description: 'Columns C1–C8', location: 'GF', nr: 8, length: 0.4, width: 0.4, height: 3.2, formula: null, is_deduction: false, quantity: 4.1, notes: null, drawing_id: 'dwg-1', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 1, created_at: now, updated_at: now },
    ],
  },
  {
    id: 'mi-3', project_id: mockProject.id, item_code: '2.30', description: 'Formwork to column sides, plywood faced',
    unit: 'm²', measurement_type: 'area', section: 'Ground Floor — Columns', drawing_ref: 'S-201', location: null, sort_order: 3,
    additions_qty: 43.0, deductions_qty: 0, net_qty: 43.0, created_by: 'u', updated_by: null, created_at: now, updated_at: now,
    lines: [
      { id: 'ml-5', item_id: 'mi-3', line_number: 1, description: 'Formwork to C1–C8', location: 'GF', nr: 8, length: 1.68, width: null, height: 3.2, formula: null, is_deduction: false, quantity: 43.0, notes: null, drawing_id: 'dwg-1', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 1, created_at: now, updated_at: now },
    ],
  },
  {
    id: 'mi-4', project_id: mockProject.id, item_code: '4.10', description: 'Blockwork wall, 200mm thick',
    unit: 'm²', measurement_type: 'area', section: 'Ground Floor — Walls', drawing_ref: 'A-101', location: null, sort_order: 4,
    additions_qty: 128.4, deductions_qty: 9.6, net_qty: 118.8, created_by: 'u', updated_by: null, created_at: now, updated_at: now,
    lines: [
      { id: 'ml-6', item_id: 'mi-4', line_number: 1, description: 'External perimeter wall', location: 'GF', nr: 1, length: 42.8, width: null, height: 3.0, formula: null, is_deduction: false, quantity: 128.4, notes: null, drawing_id: 'dwg-3', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 1, created_at: now, updated_at: now },
      { id: 'ml-7', item_id: 'mi-4', line_number: 2, description: 'Deduct: window & door openings', location: 'GF', nr: 6, length: 1.6, width: null, height: 1.0, formula: null, is_deduction: true, quantity: 9.6, notes: null, drawing_id: 'dwg-3', page_number: 1, drawing_measurement_id: null, geo_json: null, scale_id: null, ocr_source: null, ocr_confidence: null, ocr_text: null, sort_order: 2, created_at: now, updated_at: now },
    ],
  },
]

const boqItems: BOQItem[] = [
  { id: 'boq-1', project_id: mockProject.id, mi_id: 'mi-1', library_item_id: null, code: '2.10', description: 'RC suspended slab, 200mm thick, grade C25/30', unit: 'm³', quantity: 10.2, original_quantity: 10.2, revised_quantity: null, quantity_difference: null, unit_rate: 142.0, material_rate: null, labor_rate: null, equipment_rate: null, total_amount: 1448.4, section: 'Bill No. 2 — Concrete Works', notes: null, sort_order: 1, created_at: now, updated_at: now },
  { id: 'boq-2', project_id: mockProject.id, mi_id: 'mi-2', library_item_id: null, code: '2.20', description: 'RC column 400×400, grade C25/30', unit: 'm³', quantity: 4.1, original_quantity: 4.1, revised_quantity: null, quantity_difference: null, unit_rate: 168.0, material_rate: null, labor_rate: null, equipment_rate: null, total_amount: 688.8, section: 'Bill No. 2 — Concrete Works', notes: null, sort_order: 2, created_at: now, updated_at: now },
  { id: 'boq-3', project_id: mockProject.id, mi_id: 'mi-3', library_item_id: null, code: '2.30', description: 'Formwork to column sides, plywood faced', unit: 'm²', quantity: 43.0, original_quantity: 43.0, revised_quantity: null, quantity_difference: null, unit_rate: 18.5, material_rate: null, labor_rate: null, equipment_rate: null, total_amount: 795.5, section: 'Bill No. 2 — Concrete Works', notes: null, sort_order: 3, created_at: now, updated_at: now },
  { id: 'boq-4', project_id: mockProject.id, mi_id: 'mi-4', library_item_id: null, code: '4.10', description: 'Blockwork wall, 200mm thick', unit: 'm²', quantity: 120.0, original_quantity: 120.0, revised_quantity: null, quantity_difference: null, unit_rate: 22.0, material_rate: null, labor_rate: null, equipment_rate: null, total_amount: 2640.0, section: 'Bill No. 4 — Masonry', notes: null, sort_order: 4, created_at: now, updated_at: now },
]

const categories: LibraryCategory[] = [
  { id: 'cat-1', user_id: 'u', name: 'Concrete', description: null, sort_order: 1, created_at: now, updated_at: now },
]

const libraryItems: LibraryItem[] = [
  { id: 'lib-1', category_id: 'cat-1', user_id: 'u', code: 'C25/30', description: 'Concrete C25/30 pumped', unit: 'm³', default_rate: 62.0, material_rate: 62.0, labor_rate: null, equipment_rate: null, notes: null, sort_order: 1, created_at: now, updated_at: now },
]

const contract: Contract = {
  id: 'contract-1', project_id: mockProject.id, contract_value: 1_250_000, contingency_pct: 5, retention_pct: 5,
  advance_pct: 10, vat_pct: 16, start_date: '2026-01-01', end_date: '2026-12-01', duration_months: 12, notes: null, created_at: now, updated_at: now,
}

const rateAnalyses: RateAnalysis[] = [
  {
    id: 'rate-1', project_id: mockProject.id, boq_item_id: 'boq-2', library_item_id: null,
    description: 'RC column 400×400', unit: 'm³', output_qty: 1, overhead_pct: 10, profit_pct: 8,
    material_total: 63.84, labor_total: 57.12, equipment_total: 26.88, subcon_total: 0,
    direct_cost: 147.84, overhead_amount: 14.78, profit_amount: 5.38, unit_rate: 168.0, created_at: now, updated_at: now,
    resources: [
      { id: 'res-1', rate_analysis_id: 'rate-1', resource_type: 'material', description: 'Concrete C25/30, pumped', unit: 'm³', quantity: 0.98, unit_cost: 62.0, amount: 60.76, waste_pct: 2, total_amount: 60.76, sort_order: 1, created_at: now },
      { id: 'res-2', rate_analysis_id: 'rate-1', resource_type: 'material', description: 'Formwork amortised', unit: 'use', quantity: 2.1, unit_cost: 1.47, amount: 3.08, waste_pct: 0, total_amount: 3.08, sort_order: 2, created_at: now },
      { id: 'res-3', rate_analysis_id: 'rate-1', resource_type: 'labor', description: 'Skilled mason', unit: 'hr', quantity: 1.4, unit_cost: 22.4, amount: 31.36, waste_pct: 0, total_amount: 31.36, sort_order: 3, created_at: now },
      { id: 'res-4', rate_analysis_id: 'rate-1', resource_type: 'labor', description: 'Labourer', unit: 'hr', quantity: 2.6, unit_cost: 9.9, amount: 25.76, waste_pct: 0, total_amount: 25.76, sort_order: 4, created_at: now },
      { id: 'res-5', rate_analysis_id: 'rate-1', resource_type: 'equipment', description: 'Tower crane share', unit: 'hr', quantity: 0.4, unit_cost: 67.2, amount: 26.88, waste_pct: 0, total_amount: 26.88, sort_order: 5, created_at: now },
    ],
  },
  {
    id: 'rate-2', project_id: mockProject.id, boq_item_id: 'boq-1', library_item_id: null,
    description: 'RC suspended slab, 200mm thick', unit: 'm³', output_qty: 1, overhead_pct: 10, profit_pct: 8,
    material_total: 78.4, labor_total: 42.0, equipment_total: 12.6, subcon_total: 0,
    direct_cost: 133.0, overhead_amount: 6.65, profit_amount: 2.35, unit_rate: 142.0, created_at: now, updated_at: now,
    resources: [
      { id: 'res-6', rate_analysis_id: 'rate-2', resource_type: 'material', description: 'Concrete C25/30, pumped', unit: 'm³', quantity: 1.05, unit_cost: 62.0, amount: 65.1, waste_pct: 5, total_amount: 65.1, sort_order: 1, created_at: now },
      { id: 'res-7', rate_analysis_id: 'rate-2', resource_type: 'labor', description: 'Steel fixer', unit: 'hr', quantity: 1.8, unit_cost: 18.5, amount: 33.3, waste_pct: 0, total_amount: 33.3, sort_order: 2, created_at: now },
    ],
  },
]

const payments: PaymentCert[] = [
  {
    id: 'cert-1', project_id: mockProject.id, cert_number: 1, period_from: '2026-01-01', period_to: '2026-01-31', status: 'paid',
    gross_amount: 145000, previous_gross: 0, current_gross: 145000, variations_amount: 0, retention_pct: 5, retention_amount: 7250,
    previous_retention: 0, current_retention: 7250, advance_recovery: 0, previous_advance_recovery: 0, current_advance_recovery: 0,
    vat_pct: 16, vat_amount: 22040, net_payable: 159790, submitted_date: '2026-02-01', approved_date: '2026-02-05', paid_date: '2026-02-10',
    notes: null, created_at: now, updated_at: now,
    lines: [
      { id: 'pl-1', cert_id: 'cert-1', boq_item_id: 'boq-1', description: 'RC suspended slab, 200mm thick', unit: 'm³', contract_qty: 10.2, contract_rate: 142.0, contract_amount: 1448.4, previous_qty: 0, previous_amount: 0, current_qty: 10.2, current_amount: 1448.4, cumulative_qty: 10.2, cumulative_amount: 1448.4, sort_order: 1, created_at: now },
    ],
  },
  {
    id: 'cert-2', project_id: mockProject.id, cert_number: 2, period_from: '2026-02-01', period_to: '2026-02-28', status: 'approved',
    gross_amount: 168000, previous_gross: 145000, current_gross: 23000, variations_amount: 1200, retention_pct: 5, retention_amount: 8400,
    previous_retention: 7250, current_retention: 1150, advance_recovery: 0, previous_advance_recovery: 0, current_advance_recovery: 0,
    vat_pct: 16, vat_amount: 3680, net_payable: 26330, submitted_date: '2026-03-01', approved_date: '2026-03-04', paid_date: null,
    notes: null, created_at: now, updated_at: now,
    lines: [
      { id: 'pl-2', cert_id: 'cert-2', boq_item_id: 'boq-2', description: 'RC column 400×400', unit: 'm³', contract_qty: 4.1, contract_rate: 168.0, contract_amount: 688.8, previous_qty: 0, previous_amount: 0, current_qty: 4.1, current_amount: 688.8, cumulative_qty: 4.1, cumulative_amount: 688.8, sort_order: 1, created_at: now },
    ],
  },
]

export const mockWorkspaceData: WorkspaceData = {
  boqItems, drawings, measurementItems, categories, libraryItems,
  contract, costEntries: [], variations: [], revisions: {}, rateAnalyses,
  payments, drawingMeasurements: {}, quantityChanges: [],
  tenders: [], cashflow: [],
}
