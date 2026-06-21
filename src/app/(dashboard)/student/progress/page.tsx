import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Award, CheckCircle, Trophy } from 'lucide-react'
import { courses } from '@/lib/learn-content'

export default async function StudentProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: progressData },
    { data: quizData },
    { data: certData },
  ] = await Promise.all([
    supabase.from('course_progress').select('course_slug, lesson_number, completed_at').eq('user_id', user!.id).order('completed_at', { ascending: false }),
    supabase.from('quiz_attempts').select('course_slug, lesson_number, score, passed, attempted_at').eq('user_id', user!.id).order('attempted_at', { ascending: false }),
    supabase.from('certificates').select('*').eq('user_id', user!.id).order('issued_at', { ascending: false }),
  ])

  const completed = progressData ?? []
  const quizzes = quizData ?? []
  const certificates = certData ?? []

  const courseStats = courses.map(course => {
    const done = completed.filter(l => l.course_slug === course.slug).length
    const pct = Math.round((done / course.lessons.length) * 100)
    const cert = certificates.find(c => c.course_slug === course.slug)
    return { slug: course.slug, title: course.title, icon: course.icon, total: course.lessons.length, done, pct, cert }
  })

  const totalLessons = courses.reduce((s, c) => s + c.lessons.length, 0)
  const totalCompleted = completed.length
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/student" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Progress</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track your learning journey</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{overallPct}%</p>
            <p className="text-xs text-slate-500">Overall Progress</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{totalCompleted}</p>
            <p className="text-xs text-slate-500">Lessons Done</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-violet-600">{quizzes.filter(q => q.passed).length}</p>
            <p className="text-xs text-slate-500">Quizzes Passed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{certificates.length}</p>
            <p className="text-xs text-slate-500">Certificates</p>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full">
          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-600" /> Certificates Earned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map((cert: { id: string; course_slug: string; full_name: string | null; certificate_number: string; issued_at: string }) => {
              const course = courses.find(c => c.slug === cert.course_slug)
              return (
                <div key={cert.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                      {course?.icon ?? '📜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-amber-900 text-sm">{course?.title ?? cert.course_slug}</h3>
                      <p className="text-xs text-amber-700 mt-0.5">Issued to: {cert.full_name}</p>
                      <p className="text-xs text-amber-600 mt-0.5">#{cert.certificate_number}</p>
                      <p className="text-xs text-amber-500 mt-0.5">
                        {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <Award size={24} className="text-amber-500 shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Course-by-course progress */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Course Progress</h2>
        <div className="space-y-2">
          {courseStats.map(cs => (
            <Link
              key={cs.slug}
              href={`/learn/${cs.slug}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="text-2xl w-10 text-center">{cs.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">{cs.title}</h3>
                  {cs.cert && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                      <CheckCircle size={10} className="inline -mt-0.5 mr-0.5" />Certified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${cs.pct === 100 ? 'bg-emerald-500' : cs.pct > 0 ? 'bg-blue-500' : 'bg-slate-200'}`}
                      style={{ width: `${cs.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">{cs.done}/{cs.total}</span>
                </div>
              </div>
              <span className={`text-sm font-bold w-12 text-right ${cs.pct === 100 ? 'text-emerald-600' : cs.pct > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {cs.pct}%
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Activity</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Course</th>
                  <th className="text-left px-4 py-2 font-medium">Lesson</th>
                  <th className="text-right px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {completed.slice(0, 15).map((entry, i) => {
                  const course = courses.find(c => c.slug === entry.course_slug)
                  const lesson = course?.lessons.find(l => l.number === entry.lesson_number)
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{course?.title ?? entry.course_slug}</td>
                      <td className="px-4 py-2.5 text-slate-600">{lesson?.title ?? `Lesson ${entry.lesson_number}`}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-right text-xs">
                        {new Date(entry.completed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
