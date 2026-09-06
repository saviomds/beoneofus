import { AlertCircle } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { REQUIREMENT_STATUS_LABEL, requirementTone } from '../lib/statusMachine'
import type { Requirement } from '../types'

export function RequirementCard({ requirement }: { requirement: Requirement }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{requirement.name}</h3>
        {requirement.required ? (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">Required</span>
        ) : (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Optional</span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{requirement.description}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <StatusBadge label={REQUIREMENT_STATUS_LABEL[requirement.status]} tone={requirementTone(requirement.status)} />
        {requirement.deadline && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Due {new Date(requirement.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
      {requirement.status === 'NEEDS_CORRECTION' && (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2.5">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>This requirement needs a correction — see the Documents tab for details.</span>
        </div>
      )}
      {requirement.instructions && (
        <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2.5">{requirement.instructions}</p>
      )}
    </div>
  )
}
