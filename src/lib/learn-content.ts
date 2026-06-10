export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface Lesson {
  number: number
  title: string
  content: string
  takeaways: string[]
}

export interface Course {
  slug: string
  title: string
  description: string
  lessonCount: number
  difficulty: Difficulty
  icon: string
  lessons: Lesson[]
}

export const courses: Course[] = [
  {
    slug: 'boq-fundamentals',
    title: 'BOQ Fundamentals',
    description: 'Learn the basics of Bills of Quantities — the cornerstone document of construction cost management.',
    lessonCount: 8,
    difficulty: 'Beginner',
    icon: '📋',
    lessons: [
      {
        number: 1,
        title: 'What is a Bill of Quantities?',
        content:
          'A Bill of Quantities (BOQ) is a document prepared by a quantity surveyor that itemises all the materials, parts, and labour required to construct a project. It is typically produced at the tender stage to allow contractors to price the work accurately. The BOQ forms the basis of the contract sum and is used to value interim payments and final accounts.',
        takeaways: [
          'A BOQ lists all materials, labour, and plant required for a project.',
          'It is used at tender stage to get comparable contractor quotes.',
          'The BOQ becomes part of the contract and governs valuations.',
        ],
      },
      {
        number: 2,
        title: 'Structure of a BOQ',
        content:
          'A standard BOQ is divided into trade sections such as Earthworks, Concrete, Masonry, and Finishes. Each section contains items described by a short text, a unit of measurement (m², m³, kg, nr), a quantity, a rate, and a total. The trade sections follow a recognised method of measurement such as SMM7 or NRM2 in the UK, or CESMM4 for civil engineering works.',
        takeaways: [
          'BOQs are divided into trade sections following a standard method of measurement.',
          'Each item has: description, unit, quantity, rate, and total.',
          'Common methods of measurement include NRM2, SMM7, and CESMM4.',
        ],
      },
      {
        number: 3,
        title: 'Units of Measurement',
        content:
          'Correct units of measurement are essential for accurate pricing. Linear items such as pipes are measured in metres (m). Area items such as floor screeds are measured in square metres (m²). Volume items such as concrete pours are measured in cubic metres (m³). Individual items such as doors or light fittings are measured as number (nr) or item (item). Using the wrong unit can lead to significant pricing errors.',
        takeaways: [
          'Linear work (pipes, skirting) → measured in metres (m).',
          'Area work (screeds, painting) → measured in square metres (m²).',
          'Volume work (concrete, earthworks) → measured in cubic metres (m³).',
        ],
      },
      {
        number: 4,
        title: 'Pricing the BOQ',
        content: 'Coming soon — this lesson covers how contractors build up unit rates using labour, plant, material, and overhead allowances.',
        takeaways: ['Content coming soon.'],
      },
      {
        number: 5,
        title: 'Provisional Sums and Prime Cost Sums',
        content: 'Coming soon — this lesson covers the difference between provisional sums and PC sums and how they are dealt with at final account.',
        takeaways: ['Content coming soon.'],
      },
      {
        number: 6,
        title: 'Dayworks',
        content: 'Coming soon — this lesson covers how daywork rates are established and used for valuing unforeseeable works.',
        takeaways: ['Content coming soon.'],
      },
      {
        number: 7,
        title: 'Interim Valuations',
        content: 'Coming soon — this lesson covers how the BOQ is used to prepare monthly interim payment applications.',
        takeaways: ['Content coming soon.'],
      },
      {
        number: 8,
        title: 'Final Account',
        content: 'Coming soon — this lesson covers how the contract sum is adjusted at completion to produce the final account.',
        takeaways: ['Content coming soon.'],
      },
    ],
  },
  {
    slug: 'cost-control-mastery',
    title: 'Cost Control Mastery',
    description: 'Master earned value analysis, cost variance reporting, and forecasting to keep projects within budget.',
    lessonCount: 10,
    difficulty: 'Intermediate',
    icon: '📊',
    lessons: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Introduction to Earned Value Management' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'Earned Value Management (EVM) is a project performance measurement technique that integrates scope, schedule, and cost to assess project performance and forecast future performance. The three key data points are Planned Value (PV) — the budgeted cost of work scheduled; Earned Value (EV) — the budgeted cost of work performed; and Actual Cost (AC) — the actual cost incurred. By comparing these three figures you can calculate Schedule Variance (SV = EV − PV) and Cost Variance (CV = EV − AC).'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['EVM integrates scope, schedule, and cost in one framework.', 'SV = EV − PV tells you if you are ahead or behind schedule.', 'CV = EV − AC tells you if you are over or under budget.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'site-management-essentials',
    title: 'Site Management Essentials',
    description: 'Learn how to run a construction site — from daily reporting and safety management to progress monitoring.',
    lessonCount: 6,
    difficulty: 'Beginner',
    icon: '🏗️',
    lessons: Array.from({ length: 6 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'The Role of the Site Manager' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'The site manager is responsible for the day-to-day running of a construction site. Key responsibilities include coordinating subcontractors and suppliers, enforcing health and safety requirements, monitoring progress against programme, and completing daily site reports. A good site manager anticipates problems before they become costly delays and maintains clear communication with the project manager and client.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['The site manager coordinates subcontractors, safety, and progress.', 'Daily site reports are the primary record of site activities.', 'Proactive communication prevents costly delays.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'contract-law-for-engineers',
    title: 'Contract Law for Engineers',
    description: 'Understand construction contract types, claims procedures, and your legal obligations on site.',
    lessonCount: 7,
    difficulty: 'Intermediate',
    icon: '⚖️',
    lessons: Array.from({ length: 7 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Types of Construction Contracts' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'Construction contracts fall into several main categories. Lump-sum contracts (fixed price) transfer cost risk to the contractor. Remeasurement contracts pay the contractor based on actual quantities measured on site against agreed rates. Cost-plus contracts reimburse the contractor\'s actual costs plus a fee. Design-and-build contracts make the contractor responsible for both design and construction. Choosing the right contract type is critical and depends on project complexity, risk allocation, and programme requirements.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['Lump-sum contracts transfer cost risk to the contractor.', 'Remeasurement contracts pay on actual quantities at agreed rates.', 'D&B contracts give the contractor design responsibility.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'quantity-takeoff-techniques',
    title: 'Quantity Takeoff Techniques',
    description: 'Master measurement methods for concrete, steel, masonry, and finishes from construction drawings.',
    lessonCount: 9,
    difficulty: 'Intermediate',
    icon: '📐',
    lessons: Array.from({ length: 9 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Reading Construction Drawings for Takeoff' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'Before taking off quantities you must understand the drawing types: general arrangement (GA) plans show the overall layout; section drawings cut through the structure to show internal geometry; detail drawings show complex junctions at large scale; reinforcement drawings show bar sizes and spacing. Always check the drawing scale bar rather than relying on the stated scale, as drawings are often printed at non-standard sizes. Cross-reference all drawing types before measuring.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['Always use the scale bar, not the stated scale when measuring.', 'GA plans, sections, and details each provide different dimensional data.', 'Cross-referencing multiple drawings prevents measurement errors.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'project-planning-gantt',
    title: 'Project Planning & Gantt',
    description: 'Learn scheduling fundamentals — work breakdown structures, dependencies, critical path, and Gantt charts.',
    lessonCount: 8,
    difficulty: 'Beginner',
    icon: '📅',
    lessons: Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Work Breakdown Structure (WBS)' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'A Work Breakdown Structure (WBS) decomposes the total project scope into manageable work packages. Starting from the overall project at Level 0, you break down into major phases (Level 1), then into deliverables (Level 2), and finally into individual work packages (Level 3) that can be assigned to a team or subcontractor. The WBS is the foundation for the project schedule, cost estimate, and responsibility matrix.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['The WBS decomposes scope into manageable work packages.', 'Work packages at Level 3 can be assigned, estimated, and scheduled.', 'The WBS underpins the schedule, budget, and responsibility matrix.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'concrete-technology',
    title: 'Concrete Technology',
    description: 'Deep-dive into mix design, water-cement ratio, admixtures, curing, and quality testing of concrete.',
    lessonCount: 6,
    difficulty: 'Advanced',
    icon: '🧱',
    lessons: Array.from({ length: 6 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Concrete Mix Design Principles' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'Concrete mix design determines the proportions of cement, fine aggregate (sand), coarse aggregate, and water to achieve required strength, workability, and durability. The water-cement (w/c) ratio is the single most important factor affecting concrete strength — lower w/c ratios produce stronger concrete. A typical C30/37 structural concrete might use a w/c ratio of 0.45 with a cement content of 320 kg/m³. Admixtures such as plasticisers allow workability to be achieved at lower w/c ratios.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['Lower water-cement ratio = higher concrete strength.', 'Plasticisers improve workability without increasing w/c ratio.', 'C30/37 means 30 MPa cylinder strength / 37 MPa cube strength.']
        : ['Content coming soon.'],
    })),
  },
  {
    slug: 'autocad-for-quantity-surveyors',
    title: 'AutoCAD for Quantity Surveyors',
    description: 'Learn to read, navigate, and extract measurements from AutoCAD drawings for quantity surveying purposes.',
    lessonCount: 12,
    difficulty: 'Advanced',
    icon: '💻',
    lessons: Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      title: i === 0 ? 'Understanding DWG File Structure' : `Lesson ${i + 1}`,
      content: i === 0
        ? 'AutoCAD DWG files organise drawing data into layers, blocks, and model/paper space. Layers group similar types of information — for example, all structural columns on one layer, dimensions on another, and annotation on a third. When performing a quantity takeoff from a DWG file, begin by auditing which layers are active and understanding the layer naming convention used on the project. Turning off irrelevant layers reduces visual clutter and the risk of measuring the wrong elements.'
        : 'Coming soon — this lesson is under development.',
      takeaways: i === 0
        ? ['DWG layers group similar drawing elements for easy control.', 'Always audit layer conventions before starting a takeoff.', 'Model space contains the design; paper space contains the print layout.']
        : ['Content coming soon.'],
    })),
  },
]

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find(c => c.slug === slug)
}
