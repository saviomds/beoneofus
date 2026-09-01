// The repository seam. Services depend on this INTERFACE only. Swapping
// FileRepository for a SqlRepository (Postgres/Supabase) later requires no
// change to services, routes or the client.

import { nanoid } from 'nanoid'
import type { CollectionMap, CollectionName, Id } from '@shared/types'
import { ConflictError, NotFoundError } from '../errors'
import type { FileStore } from './FileStore'

export type Filter<T> = Partial<Record<keyof T, unknown>>
export type Predicate<T> = (row: T) => boolean

export interface Repository<T extends { id: Id }> {
  list(filter?: Filter<T>): Promise<T[]>
  get(id: Id): Promise<T | null>
  query(predicate: Predicate<T>): Promise<T[]>
  create(dto: Record<string, unknown>, actorId?: Id): Promise<T>
  update(id: Id, patch: Partial<T>, opts?: { actorId?: Id; expectedVersion?: number }): Promise<T>
  remove(id: Id, actorId?: Id): Promise<void>
  count(filter?: Filter<T>): Promise<number>
}

function matches<T>(row: T, filter?: Filter<T>): boolean {
  if (!filter) return true
  return Object.entries(filter).every(([k, v]) => (row as Record<string, unknown>)[k] === v)
}

export class FileRepository<N extends CollectionName>
  implements Repository<CollectionMap[N] & { id: Id }>
{
  constructor(
    private readonly store: FileStore,
    private readonly collection: N,
    private readonly idPrefix: string,
  ) {}

  private rows(): (CollectionMap[N] & { id: Id })[] {
    return this.store.readRows(this.collection)
  }

  async list(filter?: Filter<CollectionMap[N] & { id: Id }>) {
    return this.rows().filter((r) => matches(r, filter))
  }

  async count(filter?: Filter<CollectionMap[N] & { id: Id }>) {
    return this.rows().filter((r) => matches(r, filter)).length
  }

  async query(pred: Predicate<CollectionMap[N] & { id: Id }>) {
    return this.rows().filter(pred)
  }

  async get(id: Id) {
    return this.rows().find((r) => r.id === id) ?? null
  }

  async create(dto: Record<string, unknown>, actorId: Id = 'system') {
    const now = new Date().toISOString()
    const row = {
      id: (dto.id as string) || `${this.idPrefix}_${nanoid(12)}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...dto,
    } as unknown as CollectionMap[N] & { id: Id }

    await this.store.mutate<CollectionMap[N] & { id: Id }>(this.collection, actorId, 'CREATE', (rows) => {
      if (rows.some((r) => r.id === row.id)) {
        throw new ConflictError(`${this.collection}: a record with id ${row.id} already exists.`)
      }
      return { rows: [...rows, row], before: null, after: row, recordId: row.id }
    })
    return row
  }

  async update(
    id: Id,
    patch: Partial<CollectionMap[N]>,
    opts: { actorId?: Id; expectedVersion?: number } = {},
  ) {
    let updated!: CollectionMap[N] & { id: Id }
    await this.store.mutate<CollectionMap[N] & { id: Id }>(this.collection, opts.actorId ?? 'system', 'UPDATE', (rows) => {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) throw new NotFoundError(this.collection)
      const before = rows[idx]
      const currentVersion = (before as { version?: number }).version ?? 1
      if (opts.expectedVersion !== undefined && opts.expectedVersion !== currentVersion) {
        throw new ConflictError()
      }
      updated = {
        ...before,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
        version: currentVersion + 1,
      } as unknown as CollectionMap[N] & { id: Id }
      const next = [...rows]
      next[idx] = updated
      return { rows: next, before, after: updated, recordId: id }
    })
    return updated
  }

  async remove(id: Id, actorId: Id = 'system') {
    await this.store.mutate<CollectionMap[N] & { id: Id }>(this.collection, actorId, 'REMOVE', (rows) => {
      const idx = rows.findIndex((r) => r.id === id)
      if (idx === -1) return { rows, before: null, after: null, recordId: id }
      const before = rows[idx]
      const next = [...rows]
      if ('status' in (before as object)) {
        next[idx] = {
          ...before,
          status: 'archived',
          updatedAt: new Date().toISOString(),
          version: ((before as { version?: number }).version ?? 1) + 1,
        } as unknown as CollectionMap[N] & { id: Id }
      } else {
        next.splice(idx, 1)
      }
      return { rows: next, before, after: next[idx] ?? null, recordId: id }
    })
  }
}
