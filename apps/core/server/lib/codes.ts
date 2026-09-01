// Deterministic, collision-checked identifier generation. Codes are never
// reused once issued (we always check existing values before returning).

import type { Repository } from './store/Repository'

const YEAR = () => new Date().getFullYear()

async function nextSeq(repo: Repository<{ id: string }>, field: string, prefix: string): Promise<number> {
  const rows = (await repo.list()) as Record<string, unknown>[]
  const max = rows
    .map((r) => String(r[field] ?? ''))
    .filter((v) => v.startsWith(prefix))
    .map((v) => Number(v.split('-').pop()))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return max + 1
}

export async function studentCode(repo: Repository<{ id: string }>, country = 'RW'): Promise<string> {
  const prefix = `BOU-STU-${country}-${YEAR()}`
  const n = await nextSeq(repo, 'id', prefix)
  return `${prefix}-${String(n).padStart(6, '0')}`
}

export async function orgCode(repo: Repository<{ id: string }>, type: string, country = 'RW'): Promise<string> {
  const t = { SCHOOL: 'SCH', UNIVERSITY: 'UNI', COLLEGE: 'COL', TRAINING_CENTER: 'TRC', GOVERNMENT_INSTITUTION: 'GOV', OTHER: 'ORG' }[type] ?? 'ORG'
  const prefix = `ORG-${country}-${t}`
  const n = await nextSeq(repo, 'id', prefix)
  return `${prefix}-${String(n).padStart(6, '0')}`
}

export function classCode(grade: string, section: string, studyCode: string, year = YEAR()): string {
  return [grade, section, studyCode || 'GEN', year].filter(Boolean).join('-')
}

export async function reference(repo: Repository<{ id: string }>, prefix: string): Promise<string> {
  const p = `${prefix}-${YEAR()}`
  const rows = (await repo.list()) as { reference?: string }[]
  const max = rows
    .map((r) => Number(String(r.reference ?? '').split('-').pop()))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${p}-${String(max + 1).padStart(5, '0')}`
}

export function enrollmentRef(seq: number): string {
  return `ENR-${YEAR()}-${String(seq).padStart(6, '0')}`
}
