import { WizardSection } from './WizardSection'
import { Field, TextInput, PhoneInput, DateInput, Select } from '../FormControls'
import type { Application, EmergencyContact, PersonalInfo, TravelInfo } from '../../types'
import type { Errors } from '../../lib/validation'

interface StepProps {
  application: Application
  onChange: (patch: Partial<Application>) => void
  errors: Errors
}

export function StepPersonal({ application, onChange, errors }: StepProps) {
  const { personal, travel } = application

  function updatePersonal(patch: Partial<PersonalInfo>) {
    onChange({ personal: { ...personal, ...patch } })
  }
  function updateEmergency(patch: Partial<EmergencyContact>) {
    onChange({ personal: { ...personal, emergencyContact: { ...personal.emergencyContact, ...patch } } })
  }
  function updateTravel(patch: Partial<TravelInfo>) {
    onChange({ travel: { ...travel, ...patch } })
  }

  return (
    <div className="space-y-5">
      <WizardSection title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Legal first name" htmlFor="p-first" required error={errors['personal.legalFirstName']}>
            <TextInput id="p-first" value={personal.legalFirstName} onChange={(e) => updatePersonal({ legalFirstName: e.target.value })} error={errors['personal.legalFirstName']} />
          </Field>
          <Field label="Middle name" htmlFor="p-middle">
            <TextInput id="p-middle" value={personal.middleName} onChange={(e) => updatePersonal({ middleName: e.target.value })} />
          </Field>
          <Field label="Last name" htmlFor="p-last" required error={errors['personal.lastName']}>
            <TextInput id="p-last" value={personal.lastName} onChange={(e) => updatePersonal({ lastName: e.target.value })} error={errors['personal.lastName']} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date of birth" htmlFor="p-dob" required error={errors['personal.dateOfBirth']}>
            <DateInput id="p-dob" value={personal.dateOfBirth} onChange={(e) => updatePersonal({ dateOfBirth: e.target.value })} error={errors['personal.dateOfBirth']} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Nationality" htmlFor="p-nat" required error={errors['personal.nationality']}>
            <TextInput id="p-nat" value={personal.nationality} onChange={(e) => updatePersonal({ nationality: e.target.value })} error={errors['personal.nationality']} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country of residence" htmlFor="p-cor" required error={errors['personal.countryOfResidence']}>
            <TextInput id="p-cor" value={personal.countryOfResidence} onChange={(e) => updatePersonal({ countryOfResidence: e.target.value })} error={errors['personal.countryOfResidence']} />
          </Field>
          <Field label="City" htmlFor="p-city" required error={errors['personal.city']}>
            <TextInput id="p-city" value={personal.city} onChange={(e) => updatePersonal({ city: e.target.value })} error={errors['personal.city']} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" htmlFor="p-phone" required error={errors['personal.phone']}>
            <PhoneInput id="p-phone" value={personal.phone} onChange={(e) => updatePersonal({ phone: e.target.value })} error={errors['personal.phone']} />
          </Field>
          <Field label="Email" htmlFor="p-email" required error={errors['personal.email']}>
            <TextInput id="p-email" type="email" value={personal.email} onChange={(e) => updatePersonal({ email: e.target.value })} error={errors['personal.email']} />
          </Field>
        </div>
        <Field label="Address" htmlFor="p-address" required error={errors['personal.address']}>
          <TextInput id="p-address" value={personal.address} onChange={(e) => updatePersonal({ address: e.target.value })} error={errors['personal.address']} />
        </Field>
      </WizardSection>

      <WizardSection title="Emergency Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" htmlFor="e-name" required error={errors['emergency.name']}>
            <TextInput id="e-name" value={personal.emergencyContact.name} onChange={(e) => updateEmergency({ name: e.target.value })} error={errors['emergency.name']} />
          </Field>
          <Field label="Relationship" htmlFor="e-rel" required error={errors['emergency.relationship']}>
            <TextInput id="e-rel" value={personal.emergencyContact.relationship} onChange={(e) => updateEmergency({ relationship: e.target.value })} error={errors['emergency.relationship']} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Phone" htmlFor="e-phone" required error={errors['emergency.phone']}>
            <PhoneInput id="e-phone" value={personal.emergencyContact.phone} onChange={(e) => updateEmergency({ phone: e.target.value })} error={errors['emergency.phone']} />
          </Field>
          <Field label="Email" htmlFor="e-email">
            <TextInput id="e-email" type="email" value={personal.emergencyContact.email} onChange={(e) => updateEmergency({ email: e.target.value })} />
          </Field>
        </div>
      </WizardSection>

      <WizardSection title="Passport / Travel Information" description="Your passport details are kept private and only visible to you and your advisor.">
        <Field label="Passport status" htmlFor="t-status" required error={errors['travel.passportStatus']}>
          <Select id="t-status" value={travel.passportStatus} onChange={(e) => updateTravel({ passportStatus: e.target.value as TravelInfo['passportStatus'] })} error={errors['travel.passportStatus']}>
            <option value="">Select…</option>
            <option value="HAVE_VALID">I have a valid passport</option>
            <option value="PROCESSING">My passport is being processed</option>
            <option value="NONE">I don&apos;t currently have a passport</option>
          </Select>
        </Field>
        {travel.passportStatus === 'HAVE_VALID' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Passport number" htmlFor="t-num">
              <TextInput id="t-num" value={travel.passportNumber} onChange={(e) => updateTravel({ passportNumber: e.target.value })} />
            </Field>
            <Field label="Issuing country" htmlFor="t-country">
              <TextInput id="t-country" value={travel.issuingCountry} onChange={(e) => updateTravel({ issuingCountry: e.target.value })} />
            </Field>
            <Field label="Issue date" htmlFor="t-issue">
              <DateInput id="t-issue" value={travel.issueDate} onChange={(e) => updateTravel({ issueDate: e.target.value })} />
            </Field>
            <Field label="Expiry date" htmlFor="t-expiry">
              <DateInput id="t-expiry" value={travel.expiryDate} onChange={(e) => updateTravel({ expiryDate: e.target.value })} />
            </Field>
          </div>
        )}
      </WizardSection>
    </div>
  )
}
