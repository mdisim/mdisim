'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react'
import { Course } from '@/lib/learn-content'
import { useState, useEffect } from 'react'

const difficultyColor: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
}

interface Props {
  course: Course
}

export default function CourseClient({ course }: Props) {
  const storageKey = `learn_completed_${course.slug}`
  const [completed, setCompleted] = useState<number[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setCompleted(JSON.parse(saved))
    } catch {}
  }, [storageKey])

  const toggle = (num: number) => {
    setCompleted(prev => {
      const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const progress = Math.round((completed.length / course.lessons.length) * 100)

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to Courses
      </Link>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{course.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[course.difficulty]}`}>
                {course.difficulty}
              </span>
              <span className="text-xs text-slate-400">{course.lessonCount} lessons</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{course.description}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{completed.length}/{course.lessons.length} lessons completed</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-4">
        {course.lessons.map((lesson) => {
          const done = completed.includes(lesson.number)
          const isPlaceholder = lesson.content.startsWith('Coming soon')
          return (
            <div
              key={lesson.number}
              className={`bg-white border rounded-xl p-5 transition-all ${done ? 'border-green-300' : 'border-slate-200'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {lesson.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 mb-2">{lesson.title}</h3>
                  {isPlaceholder ? (
                    <p className="text-sm text-slate-400 italic">{lesson.content}</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{lesson.content}</p>
                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Takeaways</p>
                        <ul className="space-y-1">
                          {lesson.takeaways.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="text-blue-600 shrink-0 mt-0.5">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => toggle(lesson.number)}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                          done
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                        }`}
                      >
                        {done ? <CheckCircle size={15} /> : <Circle size={15} />}
                        {done ? 'Completed' : 'Mark Complete'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
