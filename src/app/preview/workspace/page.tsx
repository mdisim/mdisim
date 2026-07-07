'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { I18nProvider } from '@/lib/i18n'
import { WorkspaceProvider } from '@/components/workspace/workspace-context'
import { WorkspaceShell, type Mode } from '@/components/workspace/workspace-shell'
import { mockProject, mockWorkspaceData } from './mock-data'

const VALID_MODES: Mode[] = ['drawings', 'takeoff', 'measurement-book', 'qcs', 'boq', 'pricing', 'payments', 'reports', 'ai-assistant']

function PreviewInner() {
  const params = useSearchParams()
  const requested = params.get('mode') as Mode | null
  const initialMode = requested && VALID_MODES.includes(requested) ? requested : 'measurement-book'

  return (
    <I18nProvider>
      <WorkspaceProvider data={mockWorkspaceData} reload={() => {}}>
        <WorkspaceShell projectId="preview-project" project={mockProject} initialMode={initialMode} />
      </WorkspaceProvider>
    </I18nProvider>
  )
}

/** Design-QA harness — renders the real Workspace shell against fixture data so screens can be reviewed and screenshotted without a live backend. Not linked from product navigation. */
export default function WorkspacePreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewInner />
    </Suspense>
  )
}
