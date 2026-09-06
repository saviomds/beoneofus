import type { ApplicationType, Requirement, DocumentItem } from '../types'
import { newId } from '../services/storage'

// Default requirement sets per application type. This is the "configurable"
// layer the brief calls for: nothing about a requirement is hard-coded into a
// page component — a page just renders whatever this (or, later, a real API)
// returns. In production these would vary further by program, employer,
// institution, and nationality; that logic would live here too.
//
// NOTE: these are illustrative defaults for demo purposes only, not a
// guaranteed or exhaustive list of legal/immigration requirements.

interface RequirementTemplate {
  name: string
  description: string
  required: boolean
  instructions: string
}

const STUDY_TEMPLATE: RequirementTemplate[] = [
  { name: 'Valid Passport', description: 'A passport valid for at least 12 months from your intended travel date.', required: true, instructions: 'Upload a clear photo or scan of your passport bio page.' },
  { name: 'Academic Transcript', description: 'Official transcript from your most recent institution.', required: true, instructions: 'Must be an official, stamped copy.' },
  { name: 'Proof of Funds', description: 'Bank statement or sponsorship letter showing sufficient funds.', required: true, instructions: 'Should cover at least one year of estimated tuition and living costs.' },
  { name: 'Statement of Purpose', description: 'A short essay on your motivation and goals.', required: true, instructions: '500–800 words, PDF format.' },
  { name: 'English Proficiency Test', description: 'IELTS, TOEFL, or equivalent, if your prior education was not in English.', required: false, instructions: 'Not required if your degree was taught in English.' },
]

const WORK_TEMPLATE: RequirementTemplate[] = [
  { name: 'Valid Passport', description: 'A passport valid for at least 12 months from your intended travel date.', required: true, instructions: 'Upload a clear photo or scan of your passport bio page.' },
  { name: 'Police Clearance Certificate', description: 'A certificate of good conduct from your country of residence.', required: true, instructions: 'Must be issued within the last 6 months.' },
  { name: 'Curriculum Vitae (CV)', description: 'Your up-to-date professional CV.', required: true, instructions: 'PDF format, maximum 2 pages recommended.' },
  { name: 'Proof of Work Experience', description: 'Reference letters or contracts from previous employers.', required: true, instructions: 'Should confirm role, dates, and responsibilities.' },
  { name: 'Employment Contract Draft', description: 'Draft or offer letter from the prospective employer, if available.', required: false, instructions: 'Upload once you receive it from the employer — this can be added later.' },
  { name: 'Medical Certificate', description: 'A general health certificate from a licensed physician.', required: false, instructions: 'Some employers or permit categories require this — check with your advisor.' },
]

export function defaultRequirementsFor(type: ApplicationType, applicationId: string): Requirement[] {
  const template = type === 'study' ? STUDY_TEMPLATE : WORK_TEMPLATE
  return template.map((t) => ({
    id: newId('req'),
    applicationId,
    name: t.name,
    description: t.description,
    required: t.required,
    status: 'NOT_STARTED' as const,
    deadline: null,
    instructions: t.instructions,
  }))
}

export function defaultDocumentsFor(requirements: Requirement[]): DocumentItem[] {
  return requirements.map((r) => ({
    id: newId('doc'),
    applicationId: r.applicationId,
    requirementId: r.id,
    name: r.name,
    description: r.description,
    required: r.required,
    status: 'MISSING' as const,
    fileName: null,
    uploadedAt: null,
    reviewerComment: null,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 10,
  }))
}
