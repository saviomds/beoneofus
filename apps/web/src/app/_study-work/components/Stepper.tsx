import { Check } from 'lucide-react'

export interface StepDef {
  number: string
  label: string
}

export function Stepper({ steps, currentIndex }: { steps: StepDef[]; currentIndex: number }) {
  return (
    <ol className="flex items-center w-full overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
      {steps.map((step, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        return (
          <li key={step.number} className="flex items-center flex-1 min-w-[92px] last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : current
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900'
                }`}
              >
                {done ? <Check size={14} /> : step.number}
              </div>
              <span className={`text-[11px] font-semibold text-center whitespace-nowrap ${current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 rounded ${done ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
