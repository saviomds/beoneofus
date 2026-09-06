// Best-effort mirror of the local mock/demo store into real Supabase tables
// (see supabase/migrations/20260905_study_work_abroad.sql) so the platform
// admin dashboard can see and manage applicants. localStorage stays the
// synchronous source of truth for this browser's own UI — nothing here is
// allowed to block or fail visibly to the applicant.

import { supabase } from '../../supabaseClient'

const SYNCABLE = new Set([
  'users', 'applications', 'requirements', 'documents',
  'finalDocuments', 'conversations', 'messages', 'notifications', 'timeline',
])

// A real account's application row and its requirements/documents/
// conversation/timeline rows sync via separate calls (mirroring the separate
// local .save() calls that create them). The admin-ownership check on the
// server rejects a child row if its parent application isn't in the database
// yet, so these must land in the same order they were queued, not whatever
// order their network requests happen to resolve in — hence a single chained
// promise instead of independent fire-and-forget calls.
let queue: Promise<void> = Promise.resolve()

export function syncCollection(name: string, rows: unknown[]): void {
  if (typeof window === 'undefined') return
  if (!SYNCABLE.has(name) || !Array.isArray(rows) || rows.length === 0) return

  queue = queue.then(async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      await fetch('/api/study-work/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ collection: name, rows }),
      })
    } catch {
      // Network/backend hiccup — the local copy already succeeded, so this
      // must stay silent rather than surface as an applicant-facing error.
    }
  })
}
