import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BookOpen,
  Calculator,
  ClipboardList,
  BarChart3,
  GraduationCap,
  ArrowRight,
  Layers,
  Award,
  Ruler,
  DollarSign,
  FileText,
  Calendar,
  Wrench,
  Table,
} from 'lucide-react'
import { courses } from '@/lib/learn-content'

export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: progressData },
    { data: quizData },
    { data: certData },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase.from('course_progress').select('course_slug, lesson_number').eq('user_id', user!.id),
    supabase.from('quiz_attempts').select('course_slug, passed').eq('user_id', user!.id),
    supabase.from('certificates').select('course_slug').eq('user_id', user!.id),
  ])

  const completedLessons = progressData ?? []
  const quizAttempts = quizData ?? []
  const certificates = certData ?? []
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student'

  // Calculate per-course progress
  const courseProgress = courses.map(course => {
    const done = completedLessons.filter(l => l.course_slug === course.slug).length
    const pct = Math.round((done / course.lessons.length) * 100)
    const hasCert = certificates.some(c => c.course_slug === course.slug)
    return { ...course, completedCount: done, progressPct: pct, hasCert }
  })

  const totalLessonsCompleted = completedLessons.length
  const totalQuizzesPassed = quizAttempts.filter(q => q.passed).length
  const totalCerts = certificates.length

  // Icon mapping for courses
  const COURSE_ICONS: Record<string, typeof BookOpen> = {
    'civil-engineering-fundamentals': Wrench,
    'quantity-surveying': Calculator,
    'boq-fundamentals': ClipboardList,
    'measurement-sheets': Ruler,
    'rebar-calculations': Layers,
    'cost-estimation': DollarSign,
    'contracts-and-claims': FileText,
    'primavera-basics': Calendar,
    'autocad-basics': Table,
    'excel-for-engineers': BarChart3,
  }

  const COURSE_COLORS: Record<string, string> = {
    'civil-engineering-fundamentals': 'bg-blue-600',
    'quantity-surveying': 'bg-emerald-600',
    'boq-fundamentals': 'bg-violet-600',
    'measurement-sheets': 'bg-amber-600',
    'rebar-calculations': 'bg-red-600',
    'cost-estimation': 'bg-teal-600',
    'contracts-and-claims': 'bg-indigo-600',
    'primavera-basics': 'bg-orange-600',
    'autocad-basics': 'bg-cyan-600',
    'excel-for-engineers': 'bg-pink-600',
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Continue learning civil engineering and quantity surveying
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
          <GraduationCap size={18} className="text-emerald-600" />
          <span className="text-emerald-700 text-sm font-semibold">Student Account</span>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{courseProgress.filter(c => c.completedCount > 0).length}</p>
              <p className="text-xs text-slate-500">Courses Started</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <ClipboardList size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalLessonsCompleted}</p>
              <p className="text-xs text-slate-500">Lessons Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalQuizzesPassed}</p>
              <p className="text-xs text-slate-500">Quizzes Passed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <GraduationCap size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCerts}</p>
              <p className="text-xs text-slate-500">Certificates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Learning Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courseProgress.map((course) => {
            const Icon = COURSE_ICONS[course.slug] ?? BookOpen
            const color = COURSE_COLORS[course.slug] ?? 'bg-slate-600'
            const started = course.completedCount > 0

            return (
              <Link
                key={course.slug}
                href={`/learn/${course.slug}`}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {course.hasCert && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Certified
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      course.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                      course.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {course.difficulty}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description}</p>

                {/* Progress bar */}
                {started ? (
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{course.completedCount}/{course.lessonCount} lessons</span>
                      <span>{course.progressPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div
                        className={`h-full rounded-full transition-all ${course.progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${course.progressPct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                    Start learning <ArrowRight size={12} />
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/calculators"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calculator size={22} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Engineering Calculators</h3>
            <p className="text-xs text-slate-500">Concrete, steel, earthwork, and more</p>
          </div>
          <ArrowRight size={16} className="text-slate-400 ml-auto" />
        </Link>
        <Link
          href="/student/progress"
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Award size={22} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">My Certificates</h3>
            <p className="text-xs text-slate-500">View and download earned certificates</p>
          </div>
          <ArrowRight size={16} className="text-slate-400 ml-auto" />
        </Link>
      </div>
    </div>
  )
}
