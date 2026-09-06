import type { ReactNode } from 'react'

/** A named, boxed section within a wizard step — keeps long forms organized
 * into logical groups instead of one huge flat form. */
export function WizardSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
      <h3 className="font-black text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{description}</p>}
      <div className={description ? 'mt-4 space-y-4' : 'mt-1 space-y-4'}>{children}</div>
    </div>
  )
}
