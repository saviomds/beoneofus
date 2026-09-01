import type { ReactNode } from 'react'
import { Button } from './primitives'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <div className="skeleton-line" style={{ width: '35%' }} />
      <div className="skeleton-line" style={{ width: '90%' }} />
      <div className="skeleton-line" style={{ width: '75%' }} />
      <div className="skeleton-line" style={{ width: '82%' }} />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="state-actions">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="state">
      <h3>Unable to load</h3>
      <p>{message}</p>
      {onRetry && (
        <div className="state-actions">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

interface AsyncLike<T> {
  data: T | null
  error: string | null
  reload: () => void
}

function isAsyncLike<T>(v: unknown): v is AsyncLike<T> {
  return typeof v === 'object' && v !== null && 'reload' in v && 'error' in v && 'data' in v
}

/** Wrap an async view: shows loading / error / empty / content consistently.
 *  `data` accepts either a plain value/null or the object returned by useAsync. */
export function AsyncView<T>({
  data,
  error,
  onRetry,
  isEmpty,
  empty,
  children,
}: {
  data: T | null | AsyncLike<T>
  error?: string | null
  onRetry?: () => void
  isEmpty?: (d: T) => boolean
  empty?: ReactNode
  children: (d: T) => ReactNode
}) {
  let value: T | null
  let err: string | null | undefined = error
  let retry = onRetry
  if (isAsyncLike<T>(data)) {
    value = data.data
    err = err ?? data.error
    retry = retry ?? data.reload
  } else {
    value = data
  }
  if (err) return <ErrorState message={err} onRetry={retry} />
  if (value === null) return <Loading />
  if (isEmpty && isEmpty(value)) return <>{empty ?? <EmptyState />}</>
  return <>{children(value)}</>
}
