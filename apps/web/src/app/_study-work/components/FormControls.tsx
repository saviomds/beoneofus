'use client'

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const BASE_INPUT = 'w-full rounded-xl border bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors'

function inputBorder(error?: string) {
  return error ? 'border-rose-300 dark:border-rose-800' : 'border-gray-200 dark:border-gray-700'
}

export function Field({ label, htmlFor, error, hint, required, children }: {
  label: string; htmlFor: string; error?: string; hint?: string; required?: boolean; children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
    </div>
  )
}

export function TextInput({ error, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input className={`${BASE_INPUT} ${inputBorder(error)} ${className}`} aria-invalid={!!error} {...props} />
}

export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <TextInput type="tel" inputMode="tel" placeholder="+250 788 000 000" {...props} />
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <TextInput type="date" {...props} />
}

export function TextArea({ error, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea className={`${BASE_INPUT} ${inputBorder(error)} min-h-[100px] resize-y ${className}`} aria-invalid={!!error} {...props} />
}

export function Select({ error, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select className={`${BASE_INPUT} ${inputBorder(error)} ${className}`} aria-invalid={!!error} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ label, id, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; id: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer group">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/40 shrink-0"
          aria-invalid={!!error}
          {...props}
        />
        <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{label}</span>
      </label>
      {error && <p className="mt-1 ml-6 text-[11px] font-semibold text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
