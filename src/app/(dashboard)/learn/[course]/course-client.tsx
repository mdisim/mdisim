'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, Circle, Award, ChevronDown, ChevronRight, Loader2, AlertCircle, Trophy } from 'lucide-react'
import type { Course, QuizQuestion } from '@/lib/learn-content'
import { useState, useEffect, useTransition } from 'react'
import { markLessonComplete, unmarkLessonComplete, getCompletedLessons, submitQuiz, issueCertificate } from '@/app/actions/learning'

const difficultyColor: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-red-100 text-red-700',
}

interface Props {
  course: Course
}

function QuizSection({ questions, courseSlug, lessonNumber, onPass }: {
  questions: QuizQuestion[]
  courseSlug: string
  lessonNumber: number
  onPass: () => void
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return

    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++
    })
    const pct = Math.round((correct / questions.length) * 100)
    setScore(pct)
    setSubmitted(true)

    const passed = pct >= 70

    startTransition(async () => {
      await submitQuiz(courseSlug, lessonNumber, answers, pct, passed)
      if (passed) onPass()
    })
  }

  const reset = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(0)
  }

  const passed = score >= 70

  return (
    <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} className="text-blue-600" />
        <h4 className="text-sm font-semibold text-blue-900">Quiz</h4>
        {submitted && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {score}% — {passed ? 'Passed!' : 'Try again (70% needed)'}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => {
          const userAnswer = answers[qi]
          const isCorrect = submitted && userAnswer === q.correctIndex
          const isWrong = submitted && userAnswer !== undefined && userAnswer !== q.correctIndex

          return (
            <div key={qi} className={`rounded-lg p-3 ${submitted ? (isCorrect ? 'bg-green-50 border border-green-200' : isWrong ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200') : 'bg-white border border-slate-200'}`}>
              <p className="text-sm font-medium text-slate-800 mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isSelected = userAnswer === oi
                  const showCorrect = submitted && oi === q.correctIndex

                  return (
                    <button
                      key={oi}
                      onClick={() => !submitted && setAnswers(prev => ({ ...prev, [qi]: oi }))}
                      disabled={submitted}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        showCorrect
                          ? 'bg-green-100 border border-green-300 text-green-800 font-medium'
                          : isSelected && isWrong
                          ? 'bg-red-100 border border-red-300 text-red-800'
                          : isSelected
                          ? 'bg-blue-100 border border-blue-300 text-blue-800'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                      } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="font-mono text-xs mr-2 opacity-50">{String.fromCharCode(65 + oi)}.</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {submitted && q.explanation && (
                <p className="text-xs text-slate-600 mt-2 pl-2 border-l-2 border-blue-300">
                  {q.explanation}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Submit Answers ({Object.keys(answers).length}/{questions.length})
          </button>
        ) : !passed ? (
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold transition-colors"
          >
            Try Again
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function CourseClient({ course }: Props) {
  const [completed, setCompleted] = useState<number[]>([])
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [certIssued, setCertIssued] = useState(false)
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => {
    getCompletedLessons(course.slug).then(setCompleted).catch(() => {
      // Fallback to localStorage for unauthenticated or if DB table doesn't exist
      try {
        const saved = localStorage.getItem(`learn_completed_${course.slug}`)
        if (saved) setCompleted(JSON.parse(saved))
      } catch { /* empty */ }
    })
  }, [course.slug])

  const toggle = (num: number) => {
    const isDone = completed.includes(num)
    setCompleted(prev => isDone ? prev.filter(n => n !== num) : [...prev, num])

    startTransition(async () => {
      if (isDone) {
        await unmarkLessonComplete(course.slug, num)
      } else {
        await markLessonComplete(course.slug, num)
      }
    })
  }

  const progress = Math.round((completed.length / course.lessons.length) * 100)
  const allComplete = completed.length === course.lessons.length

  const handleIssueCertificate = async () => {
    setCertLoading(true)
    const result = await issueCertificate(course.slug)
    setCertLoading(false)
    if ('certificate' in result) {
      setCertIssued(true)
    }
  }

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

        {/* Certificate section */}
        {allComplete && !certIssued && (
          <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Course Complete!</p>
                <p className="text-xs text-amber-700">All lessons finished. Claim your certificate.</p>
              </div>
              <button
                onClick={handleIssueCertificate}
                disabled={certLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {certLoading ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                Get Certificate
              </button>
            </div>
          </div>
        )}
        {certIssued && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-sm text-green-800 font-medium">Certificate issued! Check your Progress page.</p>
          </div>
        )}
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        {course.lessons.map((lesson) => {
          const done = completed.includes(lesson.number)
          const isPlaceholder = lesson.content.startsWith('Coming soon')
          const isExpanded = expandedLesson === lesson.number

          return (
            <div
              key={lesson.number}
              className={`bg-white border rounded-xl transition-all ${done ? 'border-green-300' : 'border-slate-200'}`}
            >
              {/* Lesson header — always clickable */}
              <button
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.number)}
                className="flex items-center gap-4 w-full p-5 text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {done ? <CheckCircle size={16} /> : lesson.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{lesson.title}</h3>
                  {!isExpanded && !isPlaceholder && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{lesson.content.slice(0, 100)}...</p>
                  )}
                </div>
                {lesson.quiz && lesson.quiz.length > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                    Quiz
                  </span>
                )}
                {isExpanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0">
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

                      {/* Quiz section */}
                      {lesson.quiz && lesson.quiz.length > 0 && (
                        <QuizSection
                          questions={lesson.quiz}
                          courseSlug={course.slug}
                          lessonNumber={lesson.number}
                          onPass={() => {
                            if (!done) {
                              setCompleted(prev => [...prev, lesson.number])
                            }
                          }}
                        />
                      )}

                      {/* Mark complete button */}
                      <div className="mt-4">
                        <button
                          onClick={() => toggle(lesson.number)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                            done
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                          }`}
                        >
                          {done ? <CheckCircle size={15} /> : <Circle size={15} />}
                          {done ? 'Completed' : 'Mark Complete'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
