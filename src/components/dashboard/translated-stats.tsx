'use client'
import { useTranslation } from '@/lib/i18n/use-translation'
import { StatsCard } from './stats-card'
import { TrendingUp, FolderKanban, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface Props {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalBudgetFormatted: string
  totalSpentFormatted: string
  budgetRemaining: number
}

export function TranslatedStats({
  totalProjects, activeProjects, completedProjects, onHoldProjects,
  totalBudgetFormatted, totalSpentFormatted, budgetRemaining,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <StatsCard title={t('total_projects', 'Total Projects')} value={String(totalProjects)} icon={FolderKanban} color="blue" />
      <StatsCard title={t('active', 'Active')} value={String(activeProjects)} icon={TrendingUp} color="green" />
      <StatsCard title={t('completed', 'Completed')} value={String(completedProjects)} icon={CheckCircle} color="green" />
      <StatsCard title={t('on_hold', 'On Hold')} value={String(onHoldProjects)} icon={Clock} color="amber" />
      <StatsCard title={t('total_budget', 'Total Budget')} value={totalBudgetFormatted} icon={DollarSign} color="purple" />
      <StatsCard title={t('total_spent', 'Spent')} value={totalSpentFormatted} icon={AlertCircle} color={budgetRemaining < 0 ? 'red' : 'indigo'} />
    </div>
  )
}
