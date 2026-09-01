import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
  setData: (updater: T | ((prev: T | null) => T)) => void
}

/** Run an async loader on mount and whenever `deps` change. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T)(prev) : updater))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then((result) => {
        if (active) {
          setDataState(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unexpected error')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, error, loading, reload, setData }
}
