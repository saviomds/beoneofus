import type {
  Application, Requirement, DocumentItem, Conversation, Message,
  NotificationItem, TimelineEvent, FinalDocument, ClientUser,
} from '../types'

// Realistic seed data covering both application types and a spread of
// statuses, so every page in the portal has something meaningful to render
// without a backend. Two demo applications, per the brief: one Study
// (further along, CONFIRMED) and one Work (freshly UNDER_REVIEW).

export const DEMO_USER_ID = 'user-demo-001'

export const DEMO_USER: ClientUser = {
  id: DEMO_USER_ID,
  email: 'amina.demo@example.com',
  firstName: 'Amina',
  middleName: '',
  lastName: 'Kagame',
  phone: '+250 788 000 000',
  nationality: 'Rwandan',
  countryOfResidence: 'Rwanda',
  dateOfBirth: '2001-04-12',
  createdAt: '2026-08-01T09:00:00.000Z',
}

export const STUDY_APP_ID = 'app-study-mu-0001'
export const WORK_APP_ID = 'app-work-mu-0001'

export const SEED_APPLICATIONS: Application[] = [
  {
    id: STUDY_APP_ID,
    applicationNumber: 'BOA-STU-2026-0001',
    userId: DEMO_USER_ID,
    type: 'study',
    destination: 'Mauritius',
    status: 'CONFIRMED',
    progress: 40,
    createdAt: '2026-08-01T09:15:00.000Z',
    submittedAt: '2026-08-01T10:00:00.000Z',
    confirmedAt: '2026-08-03T14:00:00.000Z',
    draftStep: 4,
    personal: {
      legalFirstName: 'Amina',
      middleName: '',
      lastName: 'Kagame',
      dateOfBirth: '2001-04-12',
      nationality: 'Rwandan',
      countryOfResidence: 'Rwanda',
      city: 'Kigali',
      phone: '+250 788 000 000',
      email: 'amina.demo@example.com',
      address: 'KG 15 Ave, Kigali, Rwanda',
      emergencyContact: { name: 'Jean Kagame', relationship: 'Father', phone: '+250 788 111 111', email: 'jean.kagame@example.com' },
    },
    study: {
      educationLevel: "Bachelor's",
      preferredField: 'Computer Science',
      preferredProgram: 'MSc Software Engineering',
      preferredInstitution: 'University of Mauritius',
      preferredIntake: 'September 2027',
      previousEducation: [
        { id: 'edu-1', institution: 'University of Rwanda', qualification: "Bachelor's Degree", fieldOfStudy: 'Computer Science', startDate: '2019-09-01', endDate: '2023-06-30', grade: '3.7 GPA', country: 'Rwanda' },
      ],
      motivation: 'I want to deepen my software engineering skills in an internationally accredited program and gain global work experience.',
      careerGoals: 'Become a senior software engineer and eventually lead a technical team back home.',
      preferredLocation: 'Port Louis, Mauritius',
      budget: '$8,000–$12,000/year',
      languages: 'English (fluent), French (conversational), Kinyarwanda (native)',
    },
    work: {
      desiredOccupation: '', industry: '', skills: '', yearsOfExperience: '',
      educationLevel: '', preferredEmploymentType: '', expectedSalaryRange: '', preferredLocation: '',
      employmentHistory: [], certifications: [],
    },
    travel: {
      passportStatus: 'HAVE_VALID',
      passportNumber: 'RW1234567',
      issueDate: '2023-02-10',
      expiryDate: '2033-02-09',
      issuingCountry: 'Rwanda',
    },
  },
  {
    id: WORK_APP_ID,
    applicationNumber: 'BOA-WRK-2026-0002',
    userId: DEMO_USER_ID,
    type: 'work',
    destination: 'Mauritius',
    status: 'UNDER_REVIEW',
    progress: 25,
    createdAt: '2026-08-20T11:30:00.000Z',
    submittedAt: '2026-08-20T12:00:00.000Z',
    confirmedAt: null,
    draftStep: 4,
    personal: {
      legalFirstName: 'Amina',
      middleName: '',
      lastName: 'Kagame',
      dateOfBirth: '2001-04-12',
      nationality: 'Rwandan',
      countryOfResidence: 'Rwanda',
      city: 'Kigali',
      phone: '+250 788 000 000',
      email: 'amina.demo@example.com',
      address: 'KG 15 Ave, Kigali, Rwanda',
      emergencyContact: { name: 'Jean Kagame', relationship: 'Father', phone: '+250 788 111 111', email: 'jean.kagame@example.com' },
    },
    study: {
      educationLevel: '', preferredField: '', preferredProgram: '', preferredInstitution: '', preferredIntake: '',
      previousEducation: [], motivation: '', careerGoals: '', preferredLocation: '', budget: '', languages: '',
    },
    work: {
      desiredOccupation: 'Software Engineer',
      industry: 'Information Technology',
      skills: 'JavaScript, React, Node.js, SQL',
      yearsOfExperience: '3',
      educationLevel: "Bachelor's",
      preferredEmploymentType: 'Full-time',
      expectedSalaryRange: '$1,500–$2,200/month',
      preferredLocation: 'Ebène, Mauritius',
      employmentHistory: [
        { id: 'emp-1', company: 'Kigali Tech Ltd', jobTitle: 'Software Engineer', country: 'Rwanda', startDate: '2023-07-01', endDate: '', responsibilities: 'Building and maintaining web applications for fintech clients.' },
      ],
      certifications: [
        { id: 'cert-1', name: 'AWS Certified Developer', issuingOrganization: 'Amazon Web Services', date: '2025-03-01', expiryDate: '2028-03-01' },
      ],
    },
    travel: {
      passportStatus: 'HAVE_VALID',
      passportNumber: 'RW1234567',
      issueDate: '2023-02-10',
      expiryDate: '2033-02-09',
      issuingCountry: 'Rwanda',
    },
  },
]

export const SEED_REQUIREMENTS: Requirement[] = [
  // Study application — mixed states so the UI demonstrates every status.
  { id: 'req-1', applicationId: STUDY_APP_ID, name: 'Valid Passport', description: 'A passport valid for at least 12 months from your intended travel date.', required: true, status: 'APPROVED', deadline: null, instructions: 'Upload a clear photo of your passport bio page.' },
  { id: 'req-2', applicationId: STUDY_APP_ID, name: 'Academic Transcript', description: 'Official transcript from your most recent institution.', required: true, status: 'NEEDS_CORRECTION', deadline: '2026-10-15', instructions: 'Must be an official, stamped copy — a phone photo of a printout is not accepted.' },
  { id: 'req-3', applicationId: STUDY_APP_ID, name: 'Proof of Funds', description: 'Bank statement or sponsorship letter showing sufficient funds for tuition and living costs.', required: true, status: 'NOT_STARTED', deadline: '2026-11-01', instructions: 'Statement should cover at least one year of estimated costs.' },
  { id: 'req-4', applicationId: STUDY_APP_ID, name: 'Statement of Purpose', description: 'A short essay on your motivation and goals.', required: true, status: 'UNDER_REVIEW', deadline: null, instructions: '500–800 words, PDF format.' },
  { id: 'req-5', applicationId: STUDY_APP_ID, name: 'English Proficiency Test', description: 'IELTS, TOEFL, or equivalent, if your prior education was not in English.', required: false, status: 'NOT_STARTED', deadline: null, instructions: 'Not required if your degree was taught in English — attach a language-of-instruction letter instead.' },

  // Work application — not yet unlocked (still UNDER_REVIEW), so left empty on
  // purpose; the requirements page shows a "locked until confirmed" state.
]

export const SEED_DOCUMENTS: DocumentItem[] = [
  { id: 'doc-1', applicationId: STUDY_APP_ID, requirementId: 'req-1', name: 'Passport', description: 'Bio page of your current passport.', required: true, status: 'APPROVED', fileName: 'amina-passport.pdf', uploadedAt: '2026-08-05T10:00:00.000Z', reviewerComment: null, acceptedFormats: ['PDF', 'JPG', 'PNG'], maxSizeMb: 10 },
  { id: 'doc-2', applicationId: STUDY_APP_ID, requirementId: 'req-2', name: 'Academic Transcript', description: 'Official transcript from University of Rwanda.', required: true, status: 'NEEDS_CORRECTION', fileName: 'transcript-v1.jpg', uploadedAt: '2026-08-06T09:00:00.000Z', reviewerComment: 'Please upload a clearer copy — the current scan is too dark to read the grades.', acceptedFormats: ['PDF', 'JPG', 'PNG'], maxSizeMb: 10 },
  { id: 'doc-3', applicationId: STUDY_APP_ID, requirementId: 'req-3', name: 'Proof of Funds', description: 'Bank statement or sponsorship letter.', required: true, status: 'MISSING', fileName: null, uploadedAt: null, reviewerComment: null, acceptedFormats: ['PDF'], maxSizeMb: 10 },
  { id: 'doc-4', applicationId: STUDY_APP_ID, requirementId: 'req-4', name: 'Statement of Purpose', description: 'Your motivation essay.', required: true, status: 'UNDER_REVIEW', fileName: 'statement-of-purpose.pdf', uploadedAt: '2026-08-10T08:30:00.000Z', reviewerComment: null, acceptedFormats: ['PDF'], maxSizeMb: 5 },
  { id: 'doc-5', applicationId: STUDY_APP_ID, requirementId: 'req-5', name: 'English Proficiency Test', description: 'IELTS/TOEFL certificate, if applicable.', required: false, status: 'MISSING', fileName: null, uploadedAt: null, reviewerComment: null, acceptedFormats: ['PDF', 'JPG'], maxSizeMb: 10 },
]

export const SEED_CONVERSATIONS: Conversation[] = [
  { id: 'conv-study', applicationId: STUDY_APP_ID, advisorName: 'Grace Uwimana', advisorRole: 'Study Abroad Advisor', lastMessageAt: '2026-08-12T15:00:00.000Z', unread: 1 },
  { id: 'conv-work', applicationId: WORK_APP_ID, advisorName: 'Eric Habimana', advisorRole: 'Work Abroad Advisor', lastMessageAt: '2026-08-21T10:00:00.000Z', unread: 0 },
]

export const SEED_MESSAGES: Message[] = [
  { id: 'msg-1', conversationId: 'conv-study', sender: 'advisor', senderName: 'Grace Uwimana', body: 'Hi Amina, welcome! Your application has been confirmed — you can now continue with the full application and your requirements.', attachments: [], createdAt: '2026-08-03T14:05:00.000Z' },
  { id: 'msg-2', conversationId: 'conv-study', sender: 'client', senderName: 'Amina Kagame', body: 'Thank you! I will get started on the requirements today.', attachments: [], createdAt: '2026-08-03T15:00:00.000Z' },
  { id: 'msg-3', conversationId: 'conv-study', sender: 'advisor', senderName: 'Grace Uwimana', body: 'Hello, we need a clearer copy of your academic transcript. The scan you uploaded is too dark to read the grades.', attachments: [], createdAt: '2026-08-12T15:00:00.000Z' },
  { id: 'msg-4', conversationId: 'conv-work', sender: 'advisor', senderName: 'Eric Habimana', body: 'Hi Amina, thanks for submitting your Work Abroad application — it is now under review. We will be in touch once the initial review is complete.', attachments: [], createdAt: '2026-08-20T12:10:00.000Z' },
]

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  { id: 'notif-1', applicationId: STUDY_APP_ID, type: 'APPLICATION_CONFIRMED', title: 'Application confirmed', body: 'Your Study Abroad application has been confirmed. Continue to the next stage.', read: true, createdAt: '2026-08-03T14:00:00.000Z' },
  { id: 'notif-2', applicationId: STUDY_APP_ID, type: 'DOCUMENT_APPROVED', title: 'Document approved', body: 'Your passport has been approved.', read: true, createdAt: '2026-08-06T09:00:00.000Z' },
  { id: 'notif-3', applicationId: STUDY_APP_ID, type: 'DOCUMENT_REJECTED', title: 'Document needs correction', body: 'Your academic transcript needs a clearer copy.', read: false, createdAt: '2026-08-12T15:00:00.000Z' },
  { id: 'notif-4', applicationId: STUDY_APP_ID, type: 'ADVISOR_MESSAGE', title: 'New message from Grace Uwimana', body: 'Hello, we need a clearer copy of your academic transcript.', read: false, createdAt: '2026-08-12T15:00:00.000Z' },
  { id: 'notif-5', applicationId: WORK_APP_ID, type: 'STAGE_ADVANCED', title: 'Application submitted', body: 'Your Work Abroad application has been received and is under review.', read: true, createdAt: '2026-08-20T12:00:00.000Z' },
]

export const SEED_TIMELINE: TimelineEvent[] = [
  { id: 'tl-1', applicationId: STUDY_APP_ID, label: 'Application Created', description: 'You started your Study Abroad application.', status: 'done', date: '2026-08-01' },
  { id: 'tl-2', applicationId: STUDY_APP_ID, label: 'Application Submitted', description: 'Your initial application was submitted for review.', status: 'done', date: '2026-08-01' },
  { id: 'tl-3', applicationId: STUDY_APP_ID, label: 'Initial Review', description: 'Our team reviewed your initial submission.', status: 'done', date: '2026-08-03' },
  { id: 'tl-4', applicationId: STUDY_APP_ID, label: 'Application Confirmed', description: 'Your application was confirmed and unlocked for the next stage.', status: 'done', date: '2026-08-03' },
  { id: 'tl-5', applicationId: STUDY_APP_ID, label: 'Information Completed', description: 'Complete your personal, education, and travel details.', status: 'current', date: null },
  { id: 'tl-6', applicationId: STUDY_APP_ID, label: 'Document Verification', description: 'Upload and verify your required documents.', status: 'upcoming', date: null },
  { id: 'tl-7', applicationId: STUDY_APP_ID, label: 'Processing', description: 'Your complete application is processed.', status: 'upcoming', date: null },
  { id: 'tl-8', applicationId: STUDY_APP_ID, label: 'Final Review', description: 'A final review before approval.', status: 'upcoming', date: null },
  { id: 'tl-9', applicationId: STUDY_APP_ID, label: 'Completed', description: 'Your final document package is ready.', status: 'upcoming', date: null },

  { id: 'tl-10', applicationId: WORK_APP_ID, label: 'Application Created', description: 'You started your Work Abroad application.', status: 'done', date: '2026-08-20' },
  { id: 'tl-11', applicationId: WORK_APP_ID, label: 'Application Submitted', description: 'Your initial application was submitted for review.', status: 'done', date: '2026-08-20' },
  { id: 'tl-12', applicationId: WORK_APP_ID, label: 'Initial Review', description: 'Our team is reviewing your initial submission.', status: 'current', date: null },
  { id: 'tl-13', applicationId: WORK_APP_ID, label: 'Application Confirmed', description: 'Confirmation unlocks the next stage.', status: 'upcoming', date: null },
  { id: 'tl-14', applicationId: WORK_APP_ID, label: 'Information Completed', description: 'Complete your personal and employment details.', status: 'upcoming', date: null },
  { id: 'tl-15', applicationId: WORK_APP_ID, label: 'Document Verification', description: 'Upload and verify your required documents.', status: 'upcoming', date: null },
  { id: 'tl-16', applicationId: WORK_APP_ID, label: 'Processing', description: 'Your complete application is processed.', status: 'upcoming', date: null },
  { id: 'tl-17', applicationId: WORK_APP_ID, label: 'Final Review', description: 'A final review before approval.', status: 'upcoming', date: null },
  { id: 'tl-18', applicationId: WORK_APP_ID, label: 'Completed', description: 'Your final document package is ready.', status: 'upcoming', date: null },
]

// Only populated once an application reaches APPROVED/COMPLETED — kept empty
// here since neither seed application is there yet. The final-documents page
// only ever renders what actually exists in this array.
export const SEED_FINAL_DOCUMENTS: FinalDocument[] = []
