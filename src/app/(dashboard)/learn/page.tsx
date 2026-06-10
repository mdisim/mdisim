import Link from 'next/link'
import { courses } from '@/lib/learn-content'

const difficultyColor = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
}

export default function LearnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Learning Hub</h1>
        <p className="text-slate-500 text-sm mt-1">
          Structured courses for construction professionals — from BOQ basics to advanced concrete technology.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {courses.map((course) => (
          <div
            key={course.slug}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl mb-3">{course.icon}</div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[course.difficulty]}`}
              >
                {course.difficulty}
              </span>
              <span className="text-xs text-slate-400">{course.lessonCount} lessons</span>
            </div>
            <h2 className="font-bold text-slate-800 text-base mb-1">{course.title}</h2>
            <p className="text-sm text-slate-500 flex-1 mb-4">{course.description}</p>
            <Link
              href={`/learn/${course.slug}`}
              className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              Start Learning
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
