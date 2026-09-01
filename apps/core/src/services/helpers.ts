import { api } from '@/lib/api'
import type { Id } from '@shared/types'

const cache = new Map<Id, string>()

/** Resolve display names for actor ids (batched + cached). */
export async function namesFor(ids: (Id | null | undefined)[]): Promise<Record<string, string>> {
  const need = [...new Set(ids.filter((x): x is Id => Boolean(x)))].filter((id) => !cache.has(id))
  if (need.length) {
    try {
      const res = await api.get<Record<string, string>>('/directory/names', { ids: need.join(',') })
      for (const [k, v] of Object.entries(res)) cache.set(k, v)
    } catch {
      for (const id of need) cache.set(id, id)
    }
  }
  const out: Record<string, string> = {}
  for (const id of ids) if (id) out[id] = cache.get(id) ?? id
  return out
}

export async function nameOf(id: Id | null | undefined): Promise<string> {
  if (!id) return 'System'
  return (await namesFor([id]))[id] ?? String(id)
}
