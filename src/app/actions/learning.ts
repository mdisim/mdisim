'use server'

import { createClient } from '@/lib/supabase/server'

export async function getCompletedLessons(courseSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('course_progress')
    .select('lesson_number')
    .eq('user_id', user.id)
    .eq('course_slug', courseSlug)

  return (data ?? []).map(r => r.lesson_number)
}

export async function markLessonComplete(courseSlug: string, lessonNumber: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('course_progress')
    .upsert({
      user_id: user.id,
      course_slug: courseSlug,
      lesson_number: lessonNumber,
    }, { onConflict: 'user_id,course_slug,lesson_number' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function unmarkLessonComplete(courseSlug: string, lessonNumber: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('course_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('course_slug', courseSlug)
    .eq('lesson_number', lessonNumber)

  if (error) return { error: error.message }
  return { success: true }
}

export async function submitQuiz(courseSlug: string, lessonNumber: number, answers: Record<string, number>, score: number, passed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      course_slug: courseSlug,
      lesson_number: lessonNumber,
      score,
      answers,
      passed,
    })

  if (error) return { error: error.message }

  // Auto-mark lesson complete if quiz passed
  if (passed) {
    await markLessonComplete(courseSlug, lessonNumber)
  }

  return { success: true }
}

export async function getQuizAttempts(courseSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_slug', courseSlug)
    .order('attempted_at', { ascending: false })

  return data ?? []
}

export async function getAllProgress() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { completed: [], quizzes: [], certificates: [] }

  const [{ data: completed }, { data: quizzes }, { data: certificates }] = await Promise.all([
    supabase.from('course_progress').select('course_slug, lesson_number').eq('user_id', user.id),
    supabase.from('quiz_attempts').select('course_slug, lesson_number, score, passed').eq('user_id', user.id),
    supabase.from('certificates').select('*').eq('user_id', user.id),
  ])

  return {
    completed: completed ?? [],
    quizzes: quizzes ?? [],
    certificates: certificates ?? [],
  }
}

export async function issueCertificate(courseSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if certificate already exists
  const { data: existing } = await supabase
    .from('certificates')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_slug', courseSlug)
    .single()

  if (existing) return { error: 'Certificate already issued' }

  // Get user's full name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const certNumber = `ANGEL-${courseSlug.toUpperCase().replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`

  const { data: cert, error } = await supabase
    .from('certificates')
    .insert({
      user_id: user.id,
      course_slug: courseSlug,
      certificate_number: certNumber,
      full_name: profile?.full_name ?? user.email?.split('@')[0] ?? 'Student',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { certificate: cert }
}
