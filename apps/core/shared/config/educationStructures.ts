// Configurable education structures. Institutions reference these by key; no
// component hardcodes a country's grade list. Add a structure here and any
// institution can adopt it without code changes elsewhere.

import type { EducationStructureKey } from '../types'

export interface EducationStructure {
  key: EducationStructureKey
  label: string
  kind: 'school' | 'tertiary'
  grades: string[]
  /** Optional study/program codes commonly used at this level. */
  studyCodes?: { code: string; name: string }[]
}

export const EDUCATION_STRUCTURES: Record<EducationStructureKey, EducationStructure> = {
  PRIMARY: {
    key: 'PRIMARY', label: 'Primary', kind: 'school',
    grades: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  },
  LOWER_SECONDARY: {
    key: 'LOWER_SECONDARY', label: 'Lower Secondary', kind: 'school',
    grades: ['S1', 'S2', 'S3'],
  },
  O_LEVEL: {
    key: 'O_LEVEL', label: 'O-Level', kind: 'school',
    grades: ['S1', 'S2', 'S3'],
  },
  UPPER_SECONDARY: {
    key: 'UPPER_SECONDARY', label: 'Upper Secondary', kind: 'school',
    grades: ['S4', 'S5', 'S6'],
  },
  A_LEVEL: {
    key: 'A_LEVEL', label: 'A-Level', kind: 'school',
    grades: ['S4', 'S5', 'S6'],
    studyCodes: [
      { code: 'MPC', name: 'Mathematics – Physics – Computer Science' },
      { code: 'MPG', name: 'Mathematics – Physics – Geography' },
      { code: 'PCB', name: 'Physics – Chemistry – Biology' },
      { code: 'MCB', name: 'Mathematics – Chemistry – Biology' },
      { code: 'HEG', name: 'History – Economics – Geography' },
      { code: 'MEG', name: 'Mathematics – Economics – Geography' },
    ],
  },
  VOCATIONAL: {
    key: 'VOCATIONAL', label: 'Vocational / TVET', kind: 'tertiary',
    grades: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
  },
  COLLEGE: {
    key: 'COLLEGE', label: 'College', kind: 'tertiary',
    grades: ['Year 1', 'Year 2', 'Year 3'],
  },
  UNIVERSITY: {
    key: 'UNIVERSITY', label: 'University (Undergraduate)', kind: 'tertiary',
    grades: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
    studyCodes: [
      { code: 'BSc-SE', name: 'BSc Software Engineering' },
      { code: 'BSc-CS', name: 'BSc Computer Science' },
      { code: 'BSc-IT', name: 'BSc Information Technology' },
      { code: 'BBA', name: 'Bachelor of Business Administration' },
    ],
  },
  POSTGRADUATE: {
    key: 'POSTGRADUATE', label: 'Postgraduate', kind: 'tertiary',
    grades: ['PgDip', 'MSc Year 1', 'MSc Year 2', 'PhD'],
  },
}

export const EDUCATION_KEYS = Object.keys(EDUCATION_STRUCTURES) as EducationStructureKey[]

export function gradesFor(keys: EducationStructureKey[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keys) {
    for (const g of EDUCATION_STRUCTURES[k]?.grades ?? []) {
      if (!seen.has(g)) {
        seen.add(g)
        out.push(g)
      }
    }
  }
  return out
}

export function studyCodesFor(keys: EducationStructureKey[]): { code: string; name: string }[] {
  const map = new Map<string, string>()
  for (const k of keys) {
    for (const s of EDUCATION_STRUCTURES[k]?.studyCodes ?? []) map.set(s.code, s.name)
  }
  return [...map.entries()].map(([code, name]) => ({ code, name }))
}

export function levelForGrade(
  keys: EducationStructureKey[],
  grade: string,
): EducationStructureKey | null {
  for (const k of keys) {
    if (EDUCATION_STRUCTURES[k]?.grades.includes(grade)) return k
  }
  return keys[0] ?? null
}
