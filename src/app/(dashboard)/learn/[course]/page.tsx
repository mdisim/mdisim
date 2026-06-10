import { notFound } from 'next/navigation'
import { courses, getCourseBySlug } from '@/lib/learn-content'
import CourseClient from './course-client'

export async function generateStaticParams() {
  return courses.map(c => ({ course: c.slug }))
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params
  const course = getCourseBySlug(slug)
  if (!course) notFound()

  return <CourseClient course={course} />
}
