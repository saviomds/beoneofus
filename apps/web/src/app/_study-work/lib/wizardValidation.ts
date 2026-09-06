import { isBlank, isValidEmail, isValidPhone, isAdult, REQUIRED_MESSAGE, type Errors } from './validation'
import type { Application } from '../types'

export function validatePersonalStep(app: Application): Errors {
  const errors: Errors = {}
  const p = app.personal
  if (isBlank(p.legalFirstName)) errors['personal.legalFirstName'] = REQUIRED_MESSAGE
  if (isBlank(p.lastName)) errors['personal.lastName'] = REQUIRED_MESSAGE
  if (!isAdult(p.dateOfBirth)) errors['personal.dateOfBirth'] = 'You must be at least 16 years old to apply.'
  if (isBlank(p.nationality)) errors['personal.nationality'] = REQUIRED_MESSAGE
  if (isBlank(p.countryOfResidence)) errors['personal.countryOfResidence'] = REQUIRED_MESSAGE
  if (isBlank(p.city)) errors['personal.city'] = REQUIRED_MESSAGE
  if (!isValidPhone(p.phone)) errors['personal.phone'] = 'Enter a valid phone number.'
  if (!isValidEmail(p.email)) errors['personal.email'] = 'Enter a valid email address.'
  if (isBlank(p.address)) errors['personal.address'] = REQUIRED_MESSAGE

  const ec = p.emergencyContact
  if (isBlank(ec.name)) errors['emergency.name'] = REQUIRED_MESSAGE
  if (isBlank(ec.relationship)) errors['emergency.relationship'] = REQUIRED_MESSAGE
  if (!isValidPhone(ec.phone)) errors['emergency.phone'] = 'Enter a valid phone number.'

  if (isBlank(app.travel.passportStatus)) errors['travel.passportStatus'] = REQUIRED_MESSAGE

  return errors
}

export function validateApplicationDetailsStep(app: Application): Errors {
  const errors: Errors = {}
  if (app.type === 'study') {
    const s = app.study
    if (isBlank(s.educationLevel)) errors['study.educationLevel'] = REQUIRED_MESSAGE
    if (isBlank(s.preferredField)) errors['study.preferredField'] = REQUIRED_MESSAGE
    if (isBlank(s.motivation)) errors['study.motivation'] = REQUIRED_MESSAGE
  } else {
    const w = app.work
    if (isBlank(w.desiredOccupation)) errors['work.desiredOccupation'] = REQUIRED_MESSAGE
    if (isBlank(w.industry)) errors['work.industry'] = REQUIRED_MESSAGE
    if (isBlank(w.yearsOfExperience)) errors['work.yearsOfExperience'] = REQUIRED_MESSAGE
    if (isBlank(w.educationLevel)) errors['work.educationLevel'] = REQUIRED_MESSAGE
  }
  return errors
}

// Education/Work (step 3) has no hard-required fields — records are optional
// to add, so there is nothing to block progress on.
export function validateEducationWorkStep(): Errors {
  return {}
}

export const WIZARD_STEP_VALIDATORS: Array<(app: Application) => Errors> = [
  validatePersonalStep,
  validateApplicationDetailsStep,
  validateEducationWorkStep,
]
