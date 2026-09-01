import { createHash } from 'node:crypto'

/** Deterministic sha256 of a collection's rows (order-sensitive, matches file). */
export function checksumOf(rows: unknown): string {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

export interface CollectionFile<T = unknown> {
  schema: number
  version: number // monotonically increasing per write
  checksum: string
  updatedAt: string
  rows: T[]
}

export const SCHEMA_VERSION = 3

export function wrap<T>(rows: T[], version: number): CollectionFile<T> {
  return {
    schema: SCHEMA_VERSION,
    version,
    checksum: checksumOf(rows),
    updatedAt: new Date().toISOString(),
    rows,
  }
}

export function verify<T>(file: CollectionFile<T>): boolean {
  return file && Array.isArray(file.rows) && file.checksum === checksumOf(file.rows)
}
