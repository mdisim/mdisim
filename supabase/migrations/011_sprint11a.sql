-- Sprint 11A: Excel-like BOQ spreadsheet, Excel import/export, Netivei Israel BOQ library

-- Add section/group support to boq_items
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS section_title text;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS is_section_header boolean DEFAULT false;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS sort_order int DEFAULT 0;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS vat_percent numeric(5,2) DEFAULT 0;
ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS vat_amount numeric(15,2) DEFAULT 0;

-- BOQ Sheets (for multi-sheet support)
CREATE TABLE IF NOT EXISTS boq_sheets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Sheet 1',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE boq_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage boq sheets" ON boq_sheets;
CREATE POLICY "Users manage boq sheets" ON boq_sheets
  FOR ALL USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = boq_sheets.project_id AND projects.created_by = auth.uid()));

ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS sheet_id uuid REFERENCES boq_sheets(id) ON DELETE SET NULL;

-- Enhance boq_library table
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS description_he text;
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS description_ar text;
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS typical_rate_ils numeric(15,2);
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS typical_rate_notes text;
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS section_code text;
ALTER TABLE boq_library ADD COLUMN IF NOT EXISTS netivei_code text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_boq_items_sort_order ON boq_items(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_boq_sheets_project ON boq_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_library_section ON boq_library(section_code);

-- Seed Netivei Israel BOQ Library
INSERT INTO boq_library (item_code, description, description_en, description_he, description_ar, unit, typical_rate_ils, category, trade, is_global, section_code) VALUES
('01.01.01', 'Bulk Excavation in Earth', 'Bulk Excavation in Earth', 'חפירת מסות בקרקע', 'حفر كتلي في التربة', 'm³', 45, 'Earthworks', 'Civil', true, '01'),
('01.01.02', 'Bulk Excavation in Rock', 'Bulk Excavation in Rock', 'חפירת מסות בסלע', 'حفر كتلي في الصخر', 'm³', 180, 'Earthworks', 'Civil', true, '01'),
('01.01.03', 'Trench Excavation 0-1.5m', 'Trench Excavation depth 0-1.5m', 'חפירת תעלה עומק 0-1.5מ', 'حفر خندق عمق 0-1.5م', 'm³', 65, 'Earthworks', 'Civil', true, '01'),
('01.01.04', 'Trench Excavation 1.5-3m', 'Trench Excavation depth 1.5-3m', 'חפירת תעלה עומק 1.5-3מ', 'حفر خندق عمق 1.5-3م', 'm³', 95, 'Earthworks', 'Civil', true, '01'),
('01.02.01', 'Backfill and Compaction', 'Backfill and Compaction with selected material', 'מילוי והדבקה', 'ردم ودك', 'm³', 55, 'Earthworks', 'Civil', true, '01'),
('01.02.02', 'Import Fill Material', 'Import approved fill material', 'ייבוא חומר מילוי', 'استيراد مواد ردم', 'm³', 85, 'Earthworks', 'Civil', true, '01'),
('01.03.01', 'Disposal of Excavated Material', 'Off-site disposal of excavated material', 'פינוי עודפי חפירה', 'التخلص من مواد الحفر', 'm³', 35, 'Earthworks', 'Civil', true, '01'),
('01.04.01', 'Sub-base Preparation 150mm', 'Prepare and compact sub-base 150mm thick', 'הכנת תת-בסיס 150מ"מ', 'تحضير طبقة أساس 150ملم', 'm²', 22, 'Earthworks', 'Civil', true, '01'),
('02.01.01', 'Plain Concrete C20 Foundations', 'Plain concrete C20/25 in foundations', 'בטון רגיל C20 ביסודות', 'خرسانة عادية C20 في الأساسات', 'm³', 650, 'Concrete', 'Structural', true, '02'),
('02.01.02', 'Reinforced Concrete C25 Ground Slab', 'Reinforced concrete C25/30 ground floor slab', 'בטון מזוין C25 רצפת קרקע', 'خرسانة مسلحة C25 بلاطة أرضية', 'm³', 950, 'Concrete', 'Structural', true, '02'),
('02.01.03', 'Reinforced Concrete C30 Columns', 'Reinforced concrete C30/37 in columns', 'בטון מזוין C30 עמודים', 'خرسانة مسلحة C30 أعمدة', 'm³', 1100, 'Concrete', 'Structural', true, '02'),
('02.01.04', 'Reinforced Concrete C30 Beams', 'Reinforced concrete C30/37 in beams', 'בטון מזוין C30 קורות', 'خرسانة مسلحة C30 عتبات', 'm³', 1150, 'Concrete', 'Structural', true, '02'),
('02.01.05', 'Reinforced Concrete C30 Suspended Slab', 'Reinforced concrete C30/37 suspended slab', 'בטון מזוין C30 תקרה', 'خرسانة مسلحة C30 بلاطة معلقة', 'm³', 1200, 'Concrete', 'Structural', true, '02'),
('02.01.06', 'Reinforced Concrete C30 Retaining Wall', 'Reinforced concrete C30/37 retaining wall', 'בטון מזוין C30 קיר תמך', 'خرسانة مسلحة C30 جدار استنادي', 'm³', 1300, 'Concrete', 'Structural', true, '02'),
('02.02.01', 'Formwork to Foundations', 'Formwork and false work to concrete foundations', 'קופת יציקה ליסודות', 'قالب للأساسات', 'm²', 85, 'Concrete', 'Structural', true, '02'),
('02.02.02', 'Formwork to Columns', 'Formwork and false work to columns', 'קופת יציקה לעמודים', 'قالب للأعمدة', 'm²', 120, 'Concrete', 'Structural', true, '02'),
('02.02.03', 'Formwork to Beams', 'Formwork to beams and soffits', 'קופת יציקה לקורות', 'قالب للעתבات', 'm²', 135, 'Concrete', 'Structural', true, '02'),
('02.02.04', 'Formwork to Suspended Slabs', 'Formwork and false work to suspended slabs', 'קופת יציקה לתקרות', 'قالب للبلاطات المعلقة', 'm²', 110, 'Concrete', 'Structural', true, '02'),
('03.01.01', 'Mild Steel Reinforcement T8', 'High yield steel reinforcement T8 bars', 'ברזל בניין T8', 'حديد تسليح T8', 'kg', 8.5, 'Reinforcement', 'Structural', true, '03'),
('03.01.02', 'Mild Steel Reinforcement T10', 'High yield steel reinforcement T10 bars', 'ברזל בניין T10', 'حديد تسليح T10', 'kg', 8.2, 'Reinforcement', 'Structural', true, '03'),
('03.01.03', 'Mild Steel Reinforcement T12', 'High yield steel reinforcement T12 bars', 'ברזל בניין T12', 'حديد تسليح T12', 'kg', 8.0, 'Reinforcement', 'Structural', true, '03'),
('03.01.04', 'Mild Steel Reinforcement T16', 'High yield steel reinforcement T16 bars', 'ברזל בניין T16', 'حديد تسליח T16', 'kg', 7.8, 'Reinforcement', 'Structural', true, '03'),
('03.01.05', 'Mild Steel Reinforcement T20', 'High yield steel reinforcement T20 bars', 'ברזל בניין T20', 'حديد تسليح T20', 'kg', 7.6, 'Reinforcement', 'Structural', true, '03'),
('03.01.06', 'Mild Steel Reinforcement T25', 'High yield steel reinforcement T25 bars', 'ברזל בניין T25', 'حديد تسليح T25', 'kg', 7.5, 'Reinforcement', 'Structural', true, '03'),
('03.01.07', 'Welded Steel Mesh A142', 'Welded steel fabric mesh A142', 'רשת ריתוך A142', 'شبك حديد ملحوم A142', 'm²', 45, 'Reinforcement', 'Structural', true, '03'),
('03.01.08', 'Welded Steel Mesh A252', 'Welded steel fabric mesh A252', 'רשת ריתוך A252', 'شبك حديد ملحوم A252', 'm²', 65, 'Reinforcement', 'Structural', true, '03'),
('04.01.01', 'Crushed Stone Base Course 200mm', 'Crushed stone base course 200mm thick', 'שכבת בסיס אבן כתוש 200מ"מ', 'طبقة أساس حجر مكسور 200ملم', 'm²', 85, 'Roads', 'Civil', true, '04'),
('04.01.02', 'Asphalt Binder Course 60mm', 'Dense bitumen macadam binder course 60mm', 'שכבת קישור אספלט 60מ"מ', 'طبقة رابط أسفلت 60ملم', 'm²', 95, 'Roads', 'Civil', true, '04'),
('04.01.03', 'Asphalt Wearing Course 40mm', 'Dense bitumen macadam wearing course 40mm', 'שכבת גלישה אספלט 40מ"מ', 'طبقة تآكل أسفلت 40ملم', 'm²', 110, 'Roads', 'Civil', true, '04'),
('04.01.04', 'Asphalt Wearing Course 60mm', 'Dense bitumen macadam wearing course 60mm', 'שכבת גלישה אספלט 60מ"מ', 'طبقة تآكل أسفلت 60ملم', 'm²', 145, 'Roads', 'Civil', true, '04'),
('04.02.01', 'Precast Concrete Kerb', 'Precast concrete kerb 300x150mm', 'אבן שפה בטון מוצק', 'حافة خرسانة مسبقة الصب', 'm', 95, 'Roads', 'Civil', true, '04'),
('04.02.02', 'Concrete Road Pavement 200mm', 'Unreinforced concrete road pavement 200mm', 'כביש בטון 200מ"מ', 'رصيف خرسانة 200ملم', 'm²', 280, 'Roads', 'Civil', true, '04'),
('05.01.01', 'PVC Drainage Pipe 150mm', 'PVC drain pipe 150mm dia laid in trench', 'צינור ניקוז PVC 150מ"מ', 'أنبوب صرف PVC 150ملم', 'm', 185, 'Drainage', 'Civil', true, '05'),
('05.01.02', 'PVC Drainage Pipe 225mm', 'PVC drain pipe 225mm dia laid in trench', 'צינור ניקוז PVC 225מ"מ', 'أنبوب صرف PVC 225ملم', 'm', 265, 'Drainage', 'Civil', true, '05'),
('05.01.03', 'PVC Drainage Pipe 300mm', 'PVC drain pipe 300mm dia laid in trench', 'צינור ניקוז PVC 300מ"מ', 'أنبوب صرف PVC 300ملم', 'm', 385, 'Drainage', 'Civil', true, '05'),
('05.02.01', 'Precast Concrete Inspection Chamber', 'Precast concrete inspection chamber 600mm dia', 'בור ביקורת בטון 600מ"מ', 'غرفة تفتيش خرسانة 600ملم', 'nr', 1850, 'Drainage', 'Civil', true, '05'),
('05.02.02', 'Gully Trap and Grating', 'Precast concrete gully trap with cast iron grating', 'תפסת ניקוז ורשת', 'مصيدة صرف وشبكة', 'nr', 650, 'Drainage', 'Civil', true, '05'),
('06.01.01', 'Concrete Block Wall 200mm', 'Concrete block wall 200mm thick in mortar', 'קיר בלוקים 200מ"מ', 'جدار بلوك خرساني 200ملم', 'm²', 185, 'Masonry', 'Structural', true, '06'),
('06.01.02', 'Concrete Block Wall 100mm', 'Concrete block partition wall 100mm thick', 'קיר בלוקים 100מ"מ', 'جدار بلوك خرساني 100ملم', 'm²', 125, 'Masonry', 'Structural', true, '06'),
('06.01.03', 'Brick Wall Half Brick', 'Clay brick wall half brick thick 110mm', 'קיר לבנים חצי לבנה', 'جدار طوب نصف طوبة', 'm²', 165, 'Masonry', 'Structural', true, '06'),
('06.01.04', 'Brick Wall One Brick', 'Clay brick wall one brick thick 220mm', 'קיר לבנים לבנה שלמה', 'جدار طوب طوبة كاملة', 'm²', 285, 'Masonry', 'Structural', true, '06'),
('07.01.01', 'Cement Sand Plaster Internal 15mm', 'Cement sand plaster internal walls 15mm', 'טיח צמנט פנימי 15מ"מ', 'ملاط أسمنت داخلي 15ملم', 'm²', 55, 'Finishes', 'Finishing', true, '07'),
('07.01.02', 'Cement Sand Render External 20mm', 'Cement sand render external walls 20mm', 'טיח צמנט חיצוני 20מ"מ', 'ملاط أسمنت خارجي 20ملم', 'm²', 85, 'Finishes', 'Finishing', true, '07'),
('07.01.03', 'Gypsum Plaster Internal 12mm', 'Gypsum plaster to internal walls 12mm', 'טיח גבס פנימי 12מ"מ', 'ملاط جبس داخلي 12ملم', 'm²', 65, 'Finishes', 'Finishing', true, '07'),
('08.01.01', 'Ceramic Floor Tiles 600x600mm', 'Ceramic floor tiles 600x600mm laid in cement', 'אריחי רצפה קרמיקה 600x600', 'بلاط أرضية سيراميك 600x600', 'm²', 185, 'Finishes', 'Finishing', true, '08'),
('08.01.02', 'Ceramic Wall Tiles 300x450mm', 'Ceramic wall tiles 300x450mm', 'אריחי קיר קרמיקה 300x450', 'بلاط جدار سيراميك 300x450', 'm²', 165, 'Finishes', 'Finishing', true, '08'),
('08.01.03', 'Porcelain Floor Tiles 600x600mm', 'Porcelain floor tiles 600x600mm', 'אריחי רצפה פורצלן 600x600', 'بلاط أرضية بورسلان 600x600', 'm²', 245, 'Finishes', 'Finishing', true, '08'),
('08.01.04', 'Granite Floor Tiles 600x600mm', 'Granite floor tiles 600x600mm polished', 'אריחי רצפה גרניט 600x600', 'بلاط أرضية غرانيت 600x600', 'm²', 385, 'Finishes', 'Finishing', true, '08'),
('08.02.01', 'Epoxy Floor Coating 3mm', 'Epoxy resin floor coating 3mm thick', 'ציפוי רצפה אפוקסי 3מ"מ', 'طلاء أرضية إيبوكسي 3ملم', 'm²', 145, 'Finishes', 'Finishing', true, '08'),
('09.01.01', 'Emulsion Paint Internal 2 coats', 'Emulsion paint to internal walls 2 coats', 'צבע אמולסיה פנימי 2 שכבות', 'طلاء داخلي 2 طبقات', 'm²', 35, 'Finishes', 'Finishing', true, '09'),
('09.01.02', 'Exterior Masonry Paint 2 coats', 'Exterior masonry paint to external walls 2 coats', 'צבע חיצוני 2 שכבות', 'طلاء خارجي 2 طبقات', 'm²', 55, 'Finishes', 'Finishing', true, '09'),
('09.01.03', 'Gloss Paint to Metalwork', 'Oil based gloss paint to steelwork 2 coats', 'צבע גלוס למתכת', 'طلاء لامع للحديد', 'm²', 75, 'Finishes', 'Finishing', true, '09'),
('09.01.04', 'Anti-corrosion Primer to Steel', 'Anti-corrosion primer to steelwork 1 coat', 'אחר אנטי-קורוזיה', 'طلاء أساس مضاد للصدأ', 'm²', 45, 'Finishes', 'Finishing', true, '09'),
('10.01.01', 'PVC Conduit 20mm Concealed', 'PVC conduit 20mm concealed in wall', 'צינור PVC 20מ"מ טמון', 'أنبوب PVC 20ملم مخفي', 'm', 35, 'Electrical', 'MEP', true, '10'),
('10.01.02', 'Single Core Cable 2.5mm2', 'Single core PVC insulated cable 2.5mm2', 'כבל חשמל 2.5מ"מ', 'كابل كهرباء 2.5مم', 'm', 18, 'Electrical', 'MEP', true, '10'),
('10.01.03', 'Single Core Cable 6mm2', 'Single core PVC insulated cable 6mm2', 'כבל חשמל 6מ"מ', 'كابل كهرباء 6مم', 'm', 38, 'Electrical', 'MEP', true, '10'),
('10.01.04', 'Single Socket Outlet', 'Single 16A socket outlet surface/flush', 'שקע חשמל בודד', 'مقبس كهربائي مفرد', 'nr', 95, 'Electrical', 'MEP', true, '10'),
('10.01.05', 'Street Light Pole 8m', 'Galvanized steel street light pole 8m', 'עמוד תאורה 8מ', 'عمود إضاءة 8م', 'nr', 2800, 'Electrical', 'MEP', true, '10'),
('11.01.01', 'UPVC Water Supply Pipe 20mm', 'UPVC water supply pipe 20mm dia', 'צינור מים UPVC 20מ"מ', 'أنبوب مياه UPVC 20ملم', 'm', 45, 'Plumbing', 'MEP', true, '11'),
('11.01.02', 'UPVC Water Supply Pipe 25mm', 'UPVC water supply pipe 25mm dia', 'צינור מים UPVC 25מ"מ', 'أنبوب مياه UPVC 25ملم', 'm', 65, 'Plumbing', 'MEP', true, '11'),
('11.01.03', 'WC Suite Complete', 'WC suite complete with cistern and seat', 'אסלה מלאה', 'طقم حمام كامل', 'nr', 850, 'Plumbing', 'MEP', true, '11'),
('11.01.04', 'Wash Hand Basin', 'Wash hand basin with taps', 'כיור ידיים', 'حوض غسيل يدين', 'nr', 650, 'Plumbing', 'MEP', true, '11'),
('12.01.01', 'Steel Safety Barrier W-Beam', 'W-beam steel safety barrier', 'מחסום בטיחות פלדה W', 'حاجز أمان فولاذي W', 'm', 285, 'Safety', 'Civil', true, '12'),
('12.01.02', 'Concrete Safety Barrier', 'Precast concrete safety barrier New Jersey type', 'מחסום בטון ניו ג''רזי', 'حاجز خرسانة نيو جيرسي', 'm', 485, 'Safety', 'Civil', true, '12'),
('12.01.03', 'Pedestrian Safety Railing', 'Galvanized steel pedestrian safety railing', 'מעקה הולכי רגל', 'درابزين مشاة', 'm', 185, 'Safety', 'Civil', true, '12'),
('13.01.01', 'Topsoil Spread 150mm', 'Spread and level imported topsoil 150mm', 'פיזור אדמה שחורה 150מ"מ', 'نشر تربة زراعية 150ملم', 'm²', 35, 'Landscaping', 'Civil', true, '13'),
('13.01.02', 'Grass Seeding', 'Grass seeding to prepared areas', 'זריעת דשא', 'بذر عشب', 'm²', 25, 'Landscaping', 'Civil', true, '13'),
('13.01.03', 'Tree Planting Medium', 'Supply and plant medium tree 2-3m height', 'נטיעת עץ בינוני', 'زراعة شجرة متوسطة', 'nr', 850, 'Landscaping', 'Civil', true, '13'),
('13.01.04', 'Irrigation System', 'Drip irrigation system complete', 'מערכת השקיה', 'نظام ري', 'm²', 45, 'Landscaping', 'Civil', true, '13')
ON CONFLICT (item_code) DO UPDATE SET
  description_en = EXCLUDED.description_en,
  description_he = EXCLUDED.description_he,
  description_ar = EXCLUDED.description_ar,
  typical_rate_ils = EXCLUDED.typical_rate_ils;
