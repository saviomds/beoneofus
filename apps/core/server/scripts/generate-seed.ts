// Regenerates server/data/seed/*.json — the initial multi-tenant database dump.
//   npm run seed
// Three tenants: ORG-RW-SCH-000001 (School A), ORG-RW-SCH-000002 (School B),
// ORG-RW-UNI-000001 (University A). Login to one must never expose another.

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { hashPassword, sha256 } from '../lib/password'

const OUT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'data', 'seed')
mkdirSync(OUT, { recursive: true })

const T0 = '2026-01-15T08:00:00.000Z'
const TU = '2026-08-20T08:00:00.000Z'
const ts = { createdAt: T0, updatedAt: TU }
const v = { version: 1 }
const PW = hashPassword('demo123', 'bou-demo-salt-fixed')
const cred = { passwordHash: PW.hash, passwordSalt: PW.salt }

const ORG_A = 'ORG-RW-SCH-000001'
const ORG_B = 'ORG-RW-SCH-000002'
const ORG_U = 'ORG-RW-UNI-000001'
const ORG_GOV = 'ORG-RW-GOV-000001'

// --- organizations -------------------------------------------------------
const organizations = [
  {
    id: ORG_A, organizationCode: ORG_A, organizationType: 'SCHOOL',
    institutionLevels: ['O_LEVEL', 'A_LEVEL'], officialName: 'Kigali Innovation Academy', shortName: 'KIA',
    registrationNumber: 'RW-EDU-2016-0771', country: 'Rwanda', province: 'Kigali City', district: 'Gasabo',
    city: 'Kigali', address: 'KG 7 Ave, Kacyiru', phone: '+250 788 100 200', email: 'office@kia.ac.rw',
    website: 'https://kia.ac.rw', logo: null, headName: 'Dr. Chantal Mukamana', headTitle: 'Principal',
    status: 'ACTIVE', authorizedBy: 'BOU-GOV-00042', ...v, ...ts,
  },
  {
    id: ORG_B, organizationCode: ORG_B, organizationType: 'SCHOOL',
    institutionLevels: ['PRIMARY', 'O_LEVEL'], officialName: 'Green Hills Academy', shortName: 'GHA',
    registrationNumber: 'RW-EDU-2007-0210', country: 'Rwanda', province: 'Kigali City', district: 'Gasabo',
    city: 'Kigali', address: 'KG 566 St, Nyarutarama', phone: '+250 788 300 400', email: 'info@greenhills.ac.rw',
    website: 'https://greenhills.ac.rw', logo: null, headName: 'Ms. Diane Uwera', headTitle: 'Head of School',
    status: 'ACTIVE', authorizedBy: 'BOU-ADM-00001', ...v, ...ts,
  },
  {
    id: ORG_U, organizationCode: ORG_U, organizationType: 'UNIVERSITY',
    institutionLevels: ['UNIVERSITY', 'POSTGRADUATE'], officialName: 'Kigali Institute of Technology', shortName: 'KIT',
    registrationNumber: 'RW-HEC-2011-0044', country: 'Rwanda', province: 'Southern', district: 'Huye',
    city: 'Huye', address: 'University Ave, Huye', phone: '+250 788 500 600', email: 'registrar@kit.ac.rw',
    website: 'https://kit.ac.rw', logo: null, headName: 'Prof. Jean-Bosco Habimana', headTitle: 'Vice-Chancellor',
    status: 'ACTIVE', authorizedBy: 'BOU-GOV-00042', ...v, ...ts,
  },
  {
    id: ORG_GOV, organizationCode: ORG_GOV, organizationType: 'GOVERNMENT_INSTITUTION',
    institutionLevels: [], officialName: 'Ministry of Education (MINEDUC)', shortName: 'MINEDUC',
    registrationNumber: 'GOV-RW-EDU', country: 'Rwanda', province: 'Kigali City', district: 'Nyarugenge',
    city: 'Kigali', address: 'MINEDUC HQ', phone: '+250 788 000 042', email: 'support@mineduc.gov.rw',
    website: 'https://mineduc.gov.rw', logo: null, headName: 'Hon. Minister of Education', headTitle: 'Minister',
    status: 'ACTIVE', authorizedBy: null, ...v, ...ts,
  },
]

// --- users -------------------------------------------------------------- -
const baseUser = (over: Record<string, unknown>) => ({
  ...cred, avatar: null, lastLogin: null, failedLogins: 0, lockedUntil: null,
  permissions: [], govScope: null, ...v, ...ts, ...over,
})

const users = [
  // Platform-level
  baseUser({ id: 'BOU-ADM-00001', code: 'BOU-ADM-00001', role: 'admin', organizationRole: null, status: 'active', name: 'Platform Operations', email: 'ops@beoneofus.work', phone: '+250 788 999 000', organizationId: null }),
  baseUser({ id: 'BOU-GDN-00001', code: 'BOU-GDN-00001', role: 'guardian', organizationRole: null, status: 'active', name: 'Josephine Uwase', email: 'josephine.uwase@example.rw', phone: '+250 788 900 111', organizationId: null }),
  baseUser({ id: 'BOU-GOV-00042', code: 'BOU-GOV-00042', role: 'government', organizationRole: null, status: 'active', name: 'MINEDUC — Analytics Desk', email: 'support@mineduc.gov.rw', phone: '+250 788 000 042', organizationId: ORG_GOV, govScope: { level: 'NATIONAL' } }),
  // School A (ORG-001)
  baseUser({ id: 'BOU-SCH-77120', code: 'BOU-SCH-77120', role: 'school', organizationRole: 'admin', status: 'active', name: 'Kigali Innovation Academy — Administration', email: 'office@kia.ac.rw', phone: '+250 788 100 200', organizationId: ORG_A }),
  baseUser({ id: 'BOU-STU-10231', code: 'BOU-STU-10231', role: 'student', organizationRole: 'student', status: 'active', name: 'Aline Uwase', email: 'aline.uwase@student.kia.ac.rw', phone: '+250 788 111 222', organizationId: ORG_A, lastLogin: '2026-08-19T15:20:00.000Z' }),
  baseUser({ id: 'BOU-TEA-40871', code: 'BOU-TEA-40871', role: 'teacher', organizationRole: 'teacher', status: 'active', name: 'Dominique Savio M.', email: 'd.savio@kia.ac.rw', phone: '+250 788 333 444', organizationId: ORG_A, permissions: ['announcements.create'] }),
  baseUser({ id: 'usr_a_stu_eric', code: 'BOU-STU-RW-2026-000012', role: 'student', organizationRole: 'student', status: 'active', name: 'Eric Habimana', email: 'eric.h@student.kia.ac.rw', phone: '+250 788 222 333', organizationId: ORG_A }),
  baseUser({ id: 'usr_a_stu_grace', code: 'BOU-STU-RW-2026-000013', role: 'student', organizationRole: 'student', status: 'inactive', name: 'Grace Mutoni', email: 'grace.m@student.kia.ac.rw', phone: '+250 788 444 555', organizationId: ORG_A }),
  baseUser({ id: 'usr_a_tea_mireille', code: 'BOU-TEA-RW-2026-000022', role: 'teacher', organizationRole: 'teacher', status: 'active', name: 'Mireille Niyonzima', email: 'm.niyonzima@kia.ac.rw', phone: '+250 788 666 777', organizationId: ORG_A }),
  // School B (ORG-002)
  baseUser({ id: 'BOU-SCH-77121', code: 'BOU-SCH-77121', role: 'school', organizationRole: 'admin', status: 'active', name: 'Green Hills Academy — Administration', email: 'info@greenhills.ac.rw', phone: '+250 788 300 400', organizationId: ORG_B }),
  baseUser({ id: 'usr_b_stu_1', code: 'BOU-STU-RW-2026-000101', role: 'student', organizationRole: 'student', status: 'active', name: 'Kevin Rugamba', email: 'kevin.r@student.gha.ac.rw', phone: '+250 788 700 100', organizationId: ORG_B }),
  baseUser({ id: 'usr_b_stu_2', code: 'BOU-STU-RW-2026-000102', role: 'student', organizationRole: 'student', status: 'active', name: 'Sandrine Ingabire', email: 'sandrine.i@student.gha.ac.rw', phone: '+250 788 700 200', organizationId: ORG_B }),
  baseUser({ id: 'usr_b_tea_1', code: 'BOU-TEA-RW-2026-000201', role: 'teacher', organizationRole: 'teacher', status: 'active', name: 'Patrick Nkurunziza', email: 'p.nkurunziza@gha.ac.rw', phone: '+250 788 700 300', organizationId: ORG_B }),
  // University A (ORG-003)
  baseUser({ id: 'BOU-ORG-UNI-00001', code: 'BOU-ORG-UNI-00001', role: 'school', organizationRole: 'admin', status: 'active', name: 'KIT — Registrar', email: 'registrar@kit.ac.rw', phone: '+250 788 500 600', organizationId: ORG_U }),
  baseUser({ id: 'usr_u_stu_1', code: 'BOU-STU-RW-2026-000301', role: 'student', organizationRole: 'student', status: 'active', name: 'Yves Mugenzi', email: 'y.mugenzi@student.kit.ac.rw', phone: '+250 788 800 100', organizationId: ORG_U }),
  baseUser({ id: 'usr_u_stu_2', code: 'BOU-STU-RW-2026-000302', role: 'student', organizationRole: 'student', status: 'active', name: 'Chantal Umutoni', email: 'c.umutoni@student.kit.ac.rw', phone: '+250 788 800 200', organizationId: ORG_U }),
  baseUser({ id: 'usr_u_lec_1', code: 'BOU-TEA-RW-2026-000401', role: 'teacher', organizationRole: 'teacher', status: 'active', name: 'Dr. Immaculée Nyirahabimana', email: 'i.nyira@kit.ac.rw', phone: '+250 788 800 300', organizationId: ORG_U }),
  baseUser({ id: 'usr_u_lec_2', code: 'BOU-TEA-RW-2026-000402', role: 'teacher', organizationRole: 'teacher', status: 'active', name: 'Dr. Emmanuel Rwigema', email: 'e.rwigema@kit.ac.rw', phone: '+250 788 800 400', organizationId: ORG_U }),
]

// --- students ---------------------------------------------------------- --
const student = (o: Record<string, unknown>) => ({
  middleName: '', nationality: 'Rwandan', program: '', studyCode: '', teacherId: null, mentorId: null,
  skills: [], interests: [], achievements: [], profileCompletion: 40, status: 'active',
  emergencyContact: '', guardianEmail: '', ...v, ...ts, ...o,
})
const students = [
  student({ id: 'STD-A-001', userId: 'BOU-STU-10231', organizationId: ORG_A, schoolId: ORG_A, institutionStudentNumber: 'KIA-2291', studentNumber: 'KIA-2291', firstName: 'Aline', lastName: 'Uwase', dateOfBirth: '2008-03-14', gender: 'female', gradeLevel: 'S5', classId: 'CLS-A-001', program: 'Software Engineering Track', studyCode: 'MPC', guardianName: 'Josephine Uwase', guardianPhone: '+250 788 900 111', address: 'Kimironko, Gasabo', enrollmentDate: '2024-09-02', teacherId: 'TCH-A-001', mentorId: 'MEN-A-001', skills: ['JavaScript', 'React', 'Problem solving'], interests: ['Web development', 'Robotics'], achievements: ['Regional coding challenge finalist 2025'], profileCompletion: 82 }),
  student({ id: 'STD-A-002', userId: 'usr_a_stu_eric', organizationId: ORG_A, schoolId: ORG_A, institutionStudentNumber: 'KIA-2340', studentNumber: 'KIA-2340', firstName: 'Eric', lastName: 'Habimana', dateOfBirth: '2007-11-02', gender: 'male', gradeLevel: 'S6', classId: 'CLS-A-002', program: 'Data Science', studyCode: 'MPC', guardianName: 'Alphonse Habimana', guardianPhone: '+250 788 900 222', address: 'Remera', enrollmentDate: '2023-09-04', teacherId: 'TCH-A-001', skills: ['Python'], profileCompletion: 64 }),
  student({ id: 'STD-A-003', userId: 'usr_a_stu_grace', organizationId: ORG_A, schoolId: ORG_A, institutionStudentNumber: 'KIA-2198', studentNumber: 'KIA-2198', firstName: 'Grace', lastName: 'Mutoni', dateOfBirth: '2008-07-20', gender: 'female', gradeLevel: 'S5', classId: 'CLS-A-001', program: 'Software Engineering Track', studyCode: 'MPC', guardianName: 'Claudine Mutoni', guardianPhone: '+250 788 900 333', address: 'Kicukiro', enrollmentDate: '2024-09-02', teacherId: 'TCH-A-001', status: 'inactive', profileCompletion: 40 }),
  student({ id: 'STD-B-001', userId: 'usr_b_stu_1', organizationId: ORG_B, schoolId: ORG_B, institutionStudentNumber: 'GHA-1101', studentNumber: 'GHA-1101', firstName: 'Kevin', lastName: 'Rugamba', dateOfBirth: '2011-01-09', gender: 'male', gradeLevel: 'S1', classId: 'CLS-B-001', program: 'Lower Secondary', guardianName: 'Marie Rugamba', guardianPhone: '+250 788 901 100', address: 'Nyarutarama', enrollmentDate: '2025-09-01', teacherId: 'TCH-B-001', profileCompletion: 55 }),
  student({ id: 'STD-B-002', userId: 'usr_b_stu_2', organizationId: ORG_B, schoolId: ORG_B, institutionStudentNumber: 'GHA-1102', studentNumber: 'GHA-1102', firstName: 'Sandrine', lastName: 'Ingabire', dateOfBirth: '2011-05-22', gender: 'female', gradeLevel: 'S1', classId: 'CLS-B-001', program: 'Lower Secondary', guardianName: 'Alice Ingabire', guardianPhone: '+250 788 901 200', address: 'Kibagabaga', enrollmentDate: '2025-09-01', teacherId: 'TCH-B-001', profileCompletion: 50 }),
  student({ id: 'STD-U-001', userId: 'usr_u_stu_1', organizationId: ORG_U, schoolId: ORG_U, institutionStudentNumber: 'KIT-SE-0455', studentNumber: 'KIT-SE-0455', firstName: 'Yves', lastName: 'Mugenzi', dateOfBirth: '2004-02-18', gender: 'male', gradeLevel: 'Year 3', classId: null, program: 'BSc Software Engineering', studyCode: 'BSc-SE', guardianName: 'Self', guardianPhone: '+250 788 800 101', address: 'Huye', enrollmentDate: '2023-09-01', profileCompletion: 70 }),
  student({ id: 'STD-U-002', userId: 'usr_u_stu_2', organizationId: ORG_U, schoolId: ORG_U, institutionStudentNumber: 'KIT-SE-0456', studentNumber: 'KIT-SE-0456', firstName: 'Chantal', lastName: 'Umutoni', dateOfBirth: '2004-09-30', gender: 'female', gradeLevel: 'Year 3', classId: null, program: 'BSc Software Engineering', studyCode: 'BSc-SE', guardianName: 'Self', guardianPhone: '+250 788 800 201', address: 'Huye', enrollmentDate: '2023-09-01', profileCompletion: 68 }),
]

// --- teachers -------------------------------------------------------- ----
const teacher = (o: Record<string, unknown>) => ({
  classIds: [], departmentId: null, qualifications: [], experienceYears: 5,
  employmentStatus: 'full_time', isMentor: false, isLecturer: false, status: 'active', ...v, ...ts, ...o,
})
const teachers = [
  teacher({ id: 'TCH-A-001', userId: 'BOU-TEA-40871', organizationId: ORG_A, schoolId: ORG_A, staffNumber: 'KIA-T-014', firstName: 'Dominique Savio', lastName: 'M.', email: 'd.savio@kia.ac.rw', phone: '+250 788 333 444', subjects: ['Software Engineering', 'Web Development'], classIds: ['CLS-A-001', 'CLS-A-002'], qualifications: ['BSc Computer Science'], experienceYears: 7, isMentor: true }),
  teacher({ id: 'TCH-A-002', userId: 'usr_a_tea_mireille', organizationId: ORG_A, schoolId: ORG_A, staffNumber: 'KIA-T-021', firstName: 'Mireille', lastName: 'Niyonzima', email: 'm.niyonzima@kia.ac.rw', phone: '+250 788 666 777', subjects: ['Mathematics', 'Data Science'], classIds: ['CLS-A-001'], experienceYears: 5 }),
  teacher({ id: 'TCH-B-001', userId: 'usr_b_tea_1', organizationId: ORG_B, schoolId: ORG_B, staffNumber: 'GHA-T-003', firstName: 'Patrick', lastName: 'Nkurunziza', email: 'p.nkurunziza@gha.ac.rw', phone: '+250 788 700 300', subjects: ['English', 'Social Studies'], classIds: ['CLS-B-001'], experienceYears: 8 }),
  teacher({ id: 'TCH-U-001', userId: 'usr_u_lec_1', organizationId: ORG_U, schoolId: ORG_U, staffNumber: 'KIT-L-101', firstName: 'Immaculée', lastName: 'Nyirahabimana', email: 'i.nyira@kit.ac.rw', phone: '+250 788 800 300', subjects: ['Software Architecture', 'Databases'], qualifications: ['PhD Computer Science'], experienceYears: 12, isLecturer: true, departmentId: 'DEP-U-001' }),
  teacher({ id: 'TCH-U-002', userId: 'usr_u_lec_2', organizationId: ORG_U, schoolId: ORG_U, staffNumber: 'KIT-L-102', firstName: 'Emmanuel', lastName: 'Rwigema', email: 'e.rwigema@kit.ac.rw', phone: '+250 788 800 400', subjects: ['Algorithms', 'Distributed Systems'], qualifications: ['PhD Software Engineering'], experienceYears: 10, isLecturer: true, departmentId: 'DEP-U-001' }),
]

const mentors = [
  { id: 'MEN-A-001', userId: 'BOU-TEA-40871', organizationId: ORG_A, schoolId: ORG_A, specialization: 'Software Engineering & AI', skills: ['React', 'Career coaching'], experienceYears: 7, availability: 'Weekdays 14:00–17:00', assignedStudentIds: ['STD-A-001'], bio: 'Software engineer and educator.', status: 'active', ...v, ...ts },
]
const mentorAssignments = [
  { id: 'MAS-001', mentorId: 'MEN-A-001', studentId: 'STD-A-001', organizationId: ORG_A, startDate: '2026-02-01', endDate: null, status: 'active', permissions: [], ...v, ...ts },
]

// --- classes / subjects --------------------------------------------- -----
const classes = [
  { id: 'CLS-A-001', organizationId: ORG_A, schoolId: ORG_A, classCode: 'S5-A-MPC-2026', name: 'S5 Software Engineering', level: 'A_LEVEL', gradeLevel: 'S5', section: 'A', studyCode: 'MPC', academicYear: '2026', homeroomTeacherId: 'TCH-A-001', subjectIds: ['SUB-A-001', 'SUB-A-002'], studentIds: ['STD-A-001', 'STD-A-003'], capacity: 40, room: 'Lab 2', status: 'active', ...v, ...ts },
  { id: 'CLS-A-002', organizationId: ORG_A, schoolId: ORG_A, classCode: 'S6-A-MPC-2026', name: 'S6 Data Science', level: 'A_LEVEL', gradeLevel: 'S6', section: 'A', studyCode: 'MPC', academicYear: '2026', homeroomTeacherId: 'TCH-A-001', subjectIds: ['SUB-A-002'], studentIds: ['STD-A-002'], capacity: 40, room: 'Lab 1', status: 'active', ...v, ...ts },
  { id: 'CLS-B-001', organizationId: ORG_B, schoolId: ORG_B, classCode: 'S1-A-GEN-2026', name: 'S1 A', level: 'O_LEVEL', gradeLevel: 'S1', section: 'A', studyCode: '', academicYear: '2026', homeroomTeacherId: 'TCH-B-001', subjectIds: ['SUB-B-001'], studentIds: ['STD-B-001', 'STD-B-002'], capacity: 45, room: 'Room 4', status: 'active', ...v, ...ts },
]
const subjects = [
  { id: 'SUB-A-001', organizationId: ORG_A, schoolId: ORG_A, name: 'Web Development', code: 'WEB5', department: 'Computing', description: 'HTML, CSS, JavaScript, React.', ...v, ...ts },
  { id: 'SUB-A-002', organizationId: ORG_A, schoolId: ORG_A, name: 'Data Structures', code: 'DS5', department: 'Computing', description: 'Core data structures and algorithms.', ...v, ...ts },
  { id: 'SUB-B-001', organizationId: ORG_B, schoolId: ORG_B, name: 'English Language', code: 'ENG1', department: 'Languages', description: 'Lower secondary English.', ...v, ...ts },
]

// --- enrollments --------------------------------------------------- ------
const enroll = (o: Record<string, unknown>) => ({ endDate: null, note: '', ...v, ...ts, ...o })
const enrollments = [
  enroll({ id: 'ENR-2024-000001', studentId: 'STD-A-001', organizationId: ORG_A, academicYear: '2024', level: 'A_LEVEL', gradeLevel: 'S4', classId: null, studyCode: 'MPC', status: 'COMPLETED', startDate: '2024-09-02', endDate: '2025-07-10', note: 'S4' }),
  enroll({ id: 'ENR-2025-000001', studentId: 'STD-A-001', organizationId: ORG_A, academicYear: '2025', level: 'A_LEVEL', gradeLevel: 'S5', classId: 'CLS-A-001', studyCode: 'MPC', status: 'ACTIVE', startDate: '2025-09-01' }),
  enroll({ id: 'ENR-2025-000002', studentId: 'STD-A-002', organizationId: ORG_A, academicYear: '2025', level: 'A_LEVEL', gradeLevel: 'S6', classId: 'CLS-A-002', studyCode: 'MPC', status: 'ACTIVE', startDate: '2025-09-01' }),
  enroll({ id: 'ENR-2025-000003', studentId: 'STD-A-003', organizationId: ORG_A, academicYear: '2025', level: 'A_LEVEL', gradeLevel: 'S5', classId: 'CLS-A-001', studyCode: 'MPC', status: 'ACTIVE', startDate: '2025-09-01' }),
  enroll({ id: 'ENR-2025-000010', studentId: 'STD-B-001', organizationId: ORG_B, academicYear: '2025', level: 'O_LEVEL', gradeLevel: 'S1', classId: 'CLS-B-001', studyCode: '', status: 'ACTIVE', startDate: '2025-09-01' }),
  enroll({ id: 'ENR-2025-000011', studentId: 'STD-B-002', organizationId: ORG_B, academicYear: '2025', level: 'O_LEVEL', gradeLevel: 'S1', classId: 'CLS-B-001', studyCode: '', status: 'ACTIVE', startDate: '2025-09-01' }),
  enroll({ id: 'ENR-2023-000020', studentId: 'STD-U-001', organizationId: ORG_U, academicYear: '2023', level: 'UNIVERSITY', gradeLevel: 'Year 3', classId: null, studyCode: 'BSc-SE', status: 'ACTIVE', startDate: '2023-09-01' }),
  enroll({ id: 'ENR-2023-000021', studentId: 'STD-U-002', organizationId: ORG_U, academicYear: '2023', level: 'UNIVERSITY', gradeLevel: 'Year 3', classId: null, studyCode: 'BSc-SE', status: 'ACTIVE', startDate: '2023-09-01' }),
]

// --- academic + attendance ---------------------------------------- -------
const acr = (o: Record<string, unknown>) => ({ ...v, ...ts, ...o })
const academicRecords = [
  acr({ id: 'ACR-A-001', studentId: 'STD-A-001', organizationId: ORG_A, schoolId: ORG_A, subjectId: 'SUB-A-001', subjectName: 'Web Development', term: 'Term 2 2026', score: 88, grade: 'A', teacherId: 'BOU-TEA-40871', teacherComment: 'Excellent grasp of React fundamentals.' }),
  acr({ id: 'ACR-A-002', studentId: 'STD-A-001', organizationId: ORG_A, schoolId: ORG_A, subjectId: 'SUB-A-002', subjectName: 'Data Structures', term: 'Term 2 2026', score: 76, grade: 'B', teacherId: 'BOU-TEA-40871', teacherComment: 'Solid; revise tree traversal.' }),
  acr({ id: 'ACR-A-003', studentId: 'STD-A-002', organizationId: ORG_A, schoolId: ORG_A, subjectId: 'SUB-A-002', subjectName: 'Data Structures', term: 'Term 2 2026', score: 71, grade: 'B', teacherId: 'BOU-TEA-40871', teacherComment: 'Good progress.' }),
  acr({ id: 'ACR-B-001', studentId: 'STD-B-001', organizationId: ORG_B, schoolId: ORG_B, subjectId: 'SUB-B-001', subjectName: 'English Language', term: 'Term 2 2026', score: 65, grade: 'C', teacherId: 'usr_b_tea_1', teacherComment: 'Improving comprehension.' }),
  acr({ id: 'ACR-U-001', studentId: 'STD-U-001', organizationId: ORG_U, schoolId: ORG_U, subjectId: 'CRS-U-001', subjectName: 'Software Architecture', term: 'Semester 1 2026', score: 74, grade: 'B', teacherId: 'usr_u_lec_1', teacherComment: 'Strong design reasoning.' }),
]
const attendance: Record<string, unknown>[] = []
const startDay = new Date('2026-08-03T00:00:00.000Z')
const roster: { s: string; c: string; o: string; p: string[] }[] = [
  { s: 'STD-A-001', c: 'CLS-A-001', o: ORG_A, p: ['present', 'present', 'present', 'late', 'present'] },
  { s: 'STD-A-002', c: 'CLS-A-002', o: ORG_A, p: ['present', 'present', 'absent', 'present', 'present'] },
  { s: 'STD-A-003', c: 'CLS-A-001', o: ORG_A, p: ['absent', 'late', 'absent', 'present', 'absent'] },
  { s: 'STD-B-001', c: 'CLS-B-001', o: ORG_B, p: ['present', 'present', 'present', 'present', 'late'] },
  { s: 'STD-B-002', c: 'CLS-B-001', o: ORG_B, p: ['present', 'late', 'present', 'present', 'present'] },
]
let ai = 0
for (const r of roster) {
  r.p.forEach((status, i) => {
    const d = new Date(startDay)
    d.setUTCDate(d.getUTCDate() + i)
    ai += 1
    attendance.push(acr({ id: `ATT-${String(ai).padStart(4, '0')}`, studentId: r.s, organizationId: r.o, schoolId: r.o, classId: r.c, period: 0, subjectId: null, date: d.toISOString().slice(0, 10), status, recordedBy: 'BOU-TEA-40871', note: '', excuseStatus: 'none', excuseReason: '', excuseDocumentId: null, excusedBy: null, excusedAt: null }))
  })
}

// --- university structures --------------------------------------- --------
const faculties = [{ id: 'FAC-U-001', organizationId: ORG_U, name: 'Faculty of Computing & Engineering', code: 'FCE', deanName: 'Prof. Alice Karekezi', ...v, ...ts }]
const departments = [{ id: 'DEP-U-001', organizationId: ORG_U, facultyId: 'FAC-U-001', name: 'Department of Software Engineering', code: 'SE', headName: 'Dr. Immaculée Nyirahabimana', ...v, ...ts }]
const programs = [{ id: 'PRG-U-001', organizationId: ORG_U, departmentId: 'DEP-U-001', name: 'BSc Software Engineering', code: 'BSc-SE', level: 'UNIVERSITY', durationYears: 4, studyCode: 'BSc-SE', ...v, ...ts }]
const courses = [
  { id: 'CRS-U-001', organizationId: ORG_U, programId: 'PRG-U-001', name: 'Software Architecture', code: 'SE301', credits: 4, year: 3, semester: 1, ...v, ...ts },
  { id: 'CRS-U-002', organizationId: ORG_U, programId: 'PRG-U-001', name: 'Distributed Systems', code: 'SE302', credits: 4, year: 3, semester: 2, ...v, ...ts },
]

// --- reports / requests / transfers / sessions ------------------ ---------
const reports = [
  { id: 'RPT-A-001', reference: 'RPT-2026-00031', organizationId: ORG_A, ...v, type: 'academic', subject: 'Term 2 academic progress — Aline Uwase', authorId: 'BOU-TEA-40871', targetUserId: 'BOU-STU-10231', content: 'Aline is performing strongly in Web Development (88%) and steadily in Data Structures (76%). Trajectory: improving.', attachments: [], status: 'approved', reviewedBy: 'BOU-SCH-77120', reviewedAt: '2026-08-12T10:00:00.000Z', reviewNote: 'Approved for parent sharing.', ...ts },
  { id: 'RPT-A-002', reference: 'RPT-2026-00032', organizationId: ORG_A, ...v, type: 'mentorship', subject: 'Mentorship progress — Aline Uwase', authorId: 'BOU-TEA-40871', targetUserId: 'BOU-STU-10231', content: 'Two sessions completed on React fundamentals and portfolio structure. On track.', attachments: [], status: 'submitted', reviewedBy: null, reviewedAt: null, reviewNote: '', ...ts },
  { id: 'RPT-B-001', reference: 'RPT-2026-00051', organizationId: ORG_B, ...v, type: 'attendance', subject: 'Weekly attendance — S1 A', authorId: 'usr_b_tea_1', targetUserId: null, content: 'Attendance 94% this week.', attachments: [], status: 'draft', reviewedBy: null, reviewedAt: null, reviewNote: '', ...ts },
]
const requests = [
  { id: 'REQ-A-001', reference: 'REQ-2026-00042', schoolId: ORG_A, organizationId: ORG_A, ...v, governmentId: ORG_GOV, governmentDepartment: 'Basic Education Directorate', type: 'Infrastructure', title: 'Request for additional computer laboratory equipment', description: 'KIA requests support for 25 workstations to expand the Software Engineering programme for the 2026–2027 intake.', attachments: [{ id: 'atr_1', fileName: 'lab-capacity-assessment.pdf', size: 184320, note: 'Internal assessment' }], priority: 'high', status: 'under_review', submittedAt: '2026-08-10T09:00:00.000Z', assignedOfficerId: 'BOU-GOV-00042', response: '', timeline: [
    { id: 'rtl_1', at: '2026-08-10T09:00:00.000Z', actorId: 'BOU-SCH-77120', action: 'SUBMITTED', note: 'Request submitted.', status: 'submitted' },
    { id: 'rtl_2', at: '2026-08-11T11:30:00.000Z', actorId: 'BOU-GOV-00042', action: 'RECEIVED', note: 'Logged by the Analytics Desk.', status: 'received' },
    { id: 'rtl_3', at: '2026-08-13T14:00:00.000Z', actorId: 'BOU-GOV-00042', action: 'ASSIGN', note: 'Assigned for review.', status: 'under_review' },
  ], ...ts },
]
const transferRequests: Record<string, unknown>[] = []

// --- inter-institution records / consent / grants ---------------- --------
const recordRequests: Record<string, unknown>[] = []
const recordGrants: Record<string, unknown>[] = []
const consents: Record<string, unknown>[] = []

// --- government data campaigns ----------------------------------- --------
const campaigns = [
  {
    id: 'CMP-2026-00001', reference: 'CMP-2026-00001',
    title: '2026 National Enrolment Census',
    description: 'All registered institutions must submit verified enrolment figures for the 2026 academic year.',
    createdBy: 'BOU-GOV-00042', governmentOrganizationId: ORG_GOV,
    fields: [
      { key: 'total_students', label: 'Total enrolled students', type: 'integer', required: true, options: [], help: 'Head count as at 1 September 2026.' },
      { key: 'female_students', label: 'Of which female', type: 'integer', required: true, options: [], help: '' },
      { key: 'teaching_staff', label: 'Teaching staff (FTE)', type: 'integer', required: true, options: [], help: '' },
      { key: 'has_computer_lab', label: 'Has a computer laboratory', type: 'boolean', required: true, options: [], help: '' },
      { key: 'notes', label: 'Notes', type: 'text', required: false, options: [], help: '' },
    ],
    audienceOrganizationTypes: ['SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER'],
    targetOrganizationIds: [],
    opensAt: '2026-08-01T00:00:00.000Z', dueAt: '2026-09-30T23:59:59.000Z',
    status: 'DRAFT', ...v, ...ts,
  },
]
const campaignSubmissions: Record<string, unknown>[] = []

// --- assessment schemes / assessments / report cards ------------- --------
const GRADE_BANDS = [
  { min: 80, letter: 'A', gpa: 4, label: 'Excellent' },
  { min: 70, letter: 'B', gpa: 3, label: 'Good' },
  { min: 60, letter: 'C', gpa: 2, label: 'Satisfactory' },
  { min: 50, letter: 'D', gpa: 1, label: 'Pass' },
  { min: 0, letter: 'F', gpa: 0, label: 'Fail' },
]
const assessmentSchemes = [
  {
    id: 'SCH-A-ALEVEL', organizationId: ORG_A, name: 'A-Level standard', level: 'A_LEVEL',
    components: [
      { key: 'ca', label: 'Continuous assessment', weight: 30 },
      { key: 'midterm', label: 'Mid-term exam', weight: 30 },
      { key: 'final', label: 'End-of-term exam', weight: 40 },
    ],
    gradeBands: GRADE_BANDS, passMark: 50, isDefault: true, ...v, ...ts,
  },
  {
    id: 'SCH-B-OLEVEL', organizationId: ORG_B, name: 'O-Level standard', level: 'O_LEVEL',
    components: [
      { key: 'ca', label: 'Continuous assessment', weight: 40 },
      { key: 'exam', label: 'Term exam', weight: 60 },
    ],
    gradeBands: GRADE_BANDS, passMark: 50, isDefault: true, ...v, ...ts,
  },
]
const asm = (o: Record<string, unknown>) => ({ maxScore: 100, comment: '', ...v, ...ts, ...o })
const assessments = [
  asm({ id: 'ASM-A-001', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-001', subjectName: 'Web Development', academicYear: '2026', term: 'Term 2 2026', componentKey: 'ca', title: 'Portfolio project', score: 90, date: '2026-06-10', teacherId: 'BOU-TEA-40871' }),
  asm({ id: 'ASM-A-002', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-001', subjectName: 'Web Development', academicYear: '2026', term: 'Term 2 2026', componentKey: 'midterm', title: 'Mid-term', score: 84, date: '2026-06-20', teacherId: 'BOU-TEA-40871' }),
  asm({ id: 'ASM-A-003', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-001', subjectName: 'Web Development', academicYear: '2026', term: 'Term 2 2026', componentKey: 'final', title: 'Final exam', score: 88, date: '2026-07-05', teacherId: 'BOU-TEA-40871' }),
  asm({ id: 'ASM-A-004', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-002', subjectName: 'Data Structures', academicYear: '2026', term: 'Term 2 2026', componentKey: 'ca', title: 'Assignments', score: 72, date: '2026-06-12', teacherId: 'BOU-TEA-40871' }),
  asm({ id: 'ASM-A-005', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-002', subjectName: 'Data Structures', academicYear: '2026', term: 'Term 2 2026', componentKey: 'midterm', title: 'Mid-term', score: 70, date: '2026-06-22', teacherId: 'BOU-TEA-40871' }),
  asm({ id: 'ASM-A-006', studentId: 'STD-A-001', organizationId: ORG_A, classId: 'CLS-A-001', subjectId: 'SUB-A-002', subjectName: 'Data Structures', academicYear: '2026', term: 'Term 2 2026', componentKey: 'final', title: 'Final exam', score: 79, date: '2026-07-06', teacherId: 'BOU-TEA-40871' }),
]
const reportCards: Record<string, unknown>[] = []
const interventions: Record<string, unknown>[] = []

// --- timetable ------------------------------------------------- ----------
const timetableSlots = [
  { id: 'TTS-A-001', organizationId: ORG_A, classId: 'CLS-A-001', dayOfWeek: 1, period: 1, startTime: '08:00', endTime: '08:50', subjectId: 'SUB-A-001', subjectName: 'Web Development', teacherId: 'TCH-A-001', room: 'Lab 2', ...v, ...ts },
  { id: 'TTS-A-002', organizationId: ORG_A, classId: 'CLS-A-001', dayOfWeek: 1, period: 2, startTime: '09:00', endTime: '09:50', subjectId: 'SUB-A-002', subjectName: 'Data Structures', teacherId: 'TCH-A-002', room: 'Lab 2', ...v, ...ts },
  { id: 'TTS-A-003', organizationId: ORG_A, classId: 'CLS-A-001', dayOfWeek: 2, period: 1, startTime: '08:00', endTime: '08:50', subjectId: 'SUB-A-002', subjectName: 'Data Structures', teacherId: 'TCH-A-002', room: 'Lab 2', ...v, ...ts },
]

// --- admissions ----------------------------------------------- -----------
const applications = [
  {
    id: 'APP-2026-00001', reference: 'APP-2026-00001', organizationId: ORG_A,
    applicantFirstName: 'Divine', applicantLastName: 'Ishimwe', dateOfBirth: '2010-05-12', gender: 'female', nationality: 'Rwandan',
    guardianName: 'Beatrice Ishimwe', guardianPhone: '+250 788 444 999', guardianEmail: 'b.ishimwe@example.rw',
    priorSchool: 'Kigali Parents School', gradeApplyingFor: 'S4', level: 'A_LEVEL', studyCode: 'MPC',
    intakeYear: '2027', notes: 'Strong maths results.', status: 'SUBMITTED', assessmentScore: null, decisionNote: '',
    offerExpiresAt: null, studentId: null, submittedBy: 'BOU-SCH-77120', reviewedBy: null,
    timeline: [{ id: 'atl_seed', at: T0, actorId: 'BOU-SCH-77120', action: 'SUBMITTED', note: '', status: 'SUBMITTED' }],
    ...ts,
  },
]

// --- finance ------------------------------------------------- ------------
const feeStructures = [
  {
    id: 'FEE-A-ALEVEL-2026', organizationId: ORG_A, name: 'A-Level day — 2026', level: 'A_LEVEL', academicYear: '2026',
    currency: 'RWF', items: [
      { label: 'Tuition', amount: 250000 },
      { label: 'Laboratory & materials', amount: 40000 },
      { label: 'Meals', amount: 60000 },
    ], total: 350000, isDefault: true, ...v, ...ts,
  },
]
const scholarships = [
  { id: 'SCL-A-001', organizationId: ORG_A, name: 'STEM merit bursary', kind: 'percentage', value: 25, fundedBy: 'KIA Foundation', studentIds: ['STD-A-002'], ...v, ...ts },
]
const invoices = [
  {
    id: 'INVF-2026-00001', reference: 'INVF-2026-00001', organizationId: ORG_A, studentId: 'STD-A-001', studentName: 'Aline Uwase',
    feeStructureId: 'FEE-A-ALEVEL-2026', academicYear: '2026', term: 'Term 3 2026', currency: 'RWF',
    lineItems: [{ label: 'Tuition', amount: 250000 }, { label: 'Laboratory & materials', amount: 40000 }, { label: 'Meals', amount: 60000 }],
    gross: 350000, discount: 0, scholarshipId: null, total: 350000, paidAmount: 150000, status: 'PARTIALLY_PAID',
    dueDate: '2026-09-30', issuedBy: 'BOU-SCH-77120', ...v, ...ts,
  },
]
const payments = [
  { id: 'PAY-A-001', receiptNumber: 'RCPT-2026-00001', invoiceId: 'INVF-2026-00001', organizationId: ORG_A, studentId: 'STD-A-001', amount: 150000, currency: 'RWF', method: 'mobile_money', reference: 'MOMO-88213', note: 'First instalment', recordedBy: 'BOU-SCH-77120', ...v, ...ts },
]

// --- guardian links -------------------------------------------- ----------
const guardianLinks = [
  { id: 'GDL-2026-00001', guardianUserId: 'BOU-GDN-00001', studentId: 'STD-A-001', organizationId: ORG_A, relationship: 'mother', status: 'active', canViewRecordTypes: ['IDENTITY', 'ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY', 'REPORTS'], isPrimary: true, addedBy: 'BOU-SCH-77120', verifiedAt: T0, ...v, ...ts },
  { id: 'GDL-2026-00002', guardianUserId: 'BOU-GDN-00001', studentId: 'STD-B-001', organizationId: ORG_B, relationship: 'guardian', status: 'active', canViewRecordTypes: ['IDENTITY', 'ACADEMIC_RECORDS', 'ATTENDANCE_SUMMARY', 'REPORTS'], isPrimary: false, addedBy: 'BOU-SCH-77121', verifiedAt: T0, ...v, ...ts },
]
const sessions = [
  { id: 'SES-A-001', mentorId: 'MEN-A-001', studentId: 'STD-A-001', organizationId: ORG_A, schoolId: ORG_A, ...v, date: '2026-08-25', time: '14:00', topic: 'React fundamentals review', status: 'scheduled', goals: ['Understand component state', 'Plan portfolio project'], progressNote: '', privateNote: 'Ready for a stretch project — introduce an API integration.', ...ts },
  { id: 'SES-A-002', mentorId: 'MEN-A-001', studentId: 'STD-A-001', organizationId: ORG_A, schoolId: ORG_A, ...v, date: '2026-08-11', time: '14:00', topic: 'Portfolio structure', status: 'completed', goals: ['Draft portfolio outline'], progressNote: 'Outline drafted, 3 projects selected.', privateNote: '', ...ts },
]

// --- communication --------------------------------------------- ----------
const conversations = [
  { id: 'CNV-001', participantIds: ['BOU-STU-10231', 'BOU-TEA-40871'], organizationId: ORG_A, subject: 'React project review', lastMessageAt: '2026-08-20T09:42:00.000Z', ...v, ...ts },
  { id: 'CNV-002', participantIds: ['BOU-SCH-77120', 'BOU-GOV-00042'], organizationId: ORG_A, subject: 'REQ-2026-00042 — lab equipment', lastMessageAt: '2026-08-13T14:05:00.000Z', ...v, ...ts },
]
const messages = [
  { id: 'MSG-001', conversationId: 'CNV-001', senderId: 'BOU-TEA-40871', body: "Let's review your React project before the next session.", readBy: ['BOU-TEA-40871'], attachments: [], createdAt: '2026-08-20T09:42:00.000Z', updatedAt: '2026-08-20T09:42:00.000Z' },
  { id: 'MSG-002', conversationId: 'CNV-001', senderId: 'BOU-STU-10231', body: 'Thank you! I pushed the latest changes last night.', readBy: ['BOU-STU-10231', 'BOU-TEA-40871'], attachments: [], createdAt: '2026-08-20T10:05:00.000Z', updatedAt: '2026-08-20T10:05:00.000Z' },
  { id: 'MSG-003', conversationId: 'CNV-002', senderId: 'BOU-GOV-00042', body: 'Request received and assigned for review.', readBy: ['BOU-GOV-00042'], attachments: [], createdAt: '2026-08-13T14:05:00.000Z', updatedAt: '2026-08-13T14:05:00.000Z' },
]
const notifications = [
  { id: 'NTF-001', recipientId: 'BOU-STU-10231', organizationId: ORG_A, type: 'report', title: 'New academic report', message: 'Your Term 2 academic progress report is available.', read: false, actionUrl: '/student/reports', ...v, ...ts },
  { id: 'NTF-002', recipientId: 'BOU-STU-10231', organizationId: ORG_A, type: 'mentorship', title: 'Upcoming mentorship session', message: 'React fundamentals review on 2026-08-25 at 14:00.', read: false, actionUrl: '/student/mentors', ...v, ...ts },
  { id: 'NTF-003', recipientId: 'BOU-TEA-40871', organizationId: ORG_A, type: 'academic', title: 'Report awaiting submission', message: 'A report is still in draft.', read: false, actionUrl: '/teacher/reports', ...v, ...ts },
  { id: 'NTF-004', recipientId: 'BOU-GOV-00042', organizationId: ORG_GOV, type: 'request', title: 'School request under review', message: 'REQ-2026-00042 from Kigali Innovation Academy is assigned to you.', read: false, actionUrl: '/government/requests', ...v, ...ts },
  { id: 'NTF-005', recipientId: 'BOU-SCH-77120', organizationId: ORG_A, type: 'government', title: 'Request update', message: 'REQ-2026-00042 is now under review by MINEDUC.', read: true, actionUrl: '/school/government', ...v, ...ts },
]

// --- documents / announcements / credentials ------------------- ----------
const documents = [
  { id: 'DOC-001', ownerId: 'BOU-STU-10231', organizationId: ORG_A, ...v, type: 'Student ID', title: 'Student ID card', fileName: 'aline-uwase-id.pdf', size: 92160, uploadedBy: 'BOU-SCH-77120', status: 'verified', note: '', ...ts },
  { id: 'DOC-002', ownerId: 'BOU-SCH-77120', organizationId: ORG_A, ...v, type: 'School registration', title: 'REB accreditation certificate', fileName: 'kia-accreditation.pdf', size: 210944, uploadedBy: 'BOU-SCH-77120', status: 'verified', note: '', ...ts },
  { id: 'DOC-003', ownerId: 'BOU-ORG-UNI-00001', organizationId: ORG_U, ...v, type: 'Institution', title: 'HEC charter', fileName: 'kit-charter.pdf', size: 301120, uploadedBy: 'BOU-ORG-UNI-00001', status: 'verified', note: '', ...ts },
]
const announcements = [
  { id: 'ANN-001', authorId: 'BOU-SCH-77120', organizationId: ORG_A, ...v, audience: 'all', scope: 'school', title: 'Term 2 examinations timetable published', body: 'The Term 2 examination timetable is now available.', priority: 'medium', pinned: true, ...ts },
  { id: 'ANN-002', authorId: 'BOU-GOV-00042', organizationId: ORG_GOV, ...v, audience: ['school'], scope: 'government', title: 'Annual enrolment data submission — deadline 30 September', body: 'All registered institutions must submit verified enrolment statistics for 2026 by 30 September 2026.', priority: 'high', pinned: true, ...ts },
  { id: 'ANN-003', authorId: 'BOU-SCH-77121', organizationId: ORG_B, ...v, audience: 'all', scope: 'school', title: 'Green Hills sports day', body: 'Sports day is on Friday. All S1 classes participate.', priority: 'low', pinned: false, ...ts },
]
const credentials = [
  { id: 'CRD-001', studentId: 'STD-A-001', organizationId: ORG_A, ...v, title: 'Web Development — Level 1', issuer: 'Kigali Innovation Academy', issuedDate: '2026-07-01', type: 'certificate', verificationCode: 'BOU-CRD-8842-AX', status: 'issued', ...ts },
]

// --- invitations ---------------------------------------------- -----------
const inviteTokenPending = 'demo-pending-invite-token-0001'
const invitations = [
  { id: 'INV-2026-00001', tokenHash: sha256(inviteTokenPending), organizationName: 'Nyamata College of Science', organizationType: 'COLLEGE', institutionLevels: ['COLLEGE'], recipientEmail: 'principal@nyamatacollege.ac.rw', recipientName: 'Mr. Théoneste Bizimana', issuedBy: 'BOU-ADM-00001', issuedByType: 'ADMIN', permissions: ['institution.create', 'institution.manage'], expiresAt: '2026-12-31T23:59:59.000Z', status: 'PENDING', acceptedAt: null, organizationId: null, ...v, ...ts },
  { id: 'INV-2026-00002', tokenHash: sha256('already-used-token-0002'), organizationName: 'Green Hills Academy', organizationType: 'SCHOOL', institutionLevels: ['PRIMARY', 'O_LEVEL'], recipientEmail: 'info@greenhills.ac.rw', recipientName: 'Ms. Diane Uwera', issuedBy: 'BOU-ADM-00001', issuedByType: 'ADMIN', permissions: ['institution.create', 'institution.manage'], expiresAt: '2026-06-30T23:59:59.000Z', status: 'ACCEPTED', acceptedAt: '2026-02-01T09:00:00.000Z', organizationId: ORG_B, ...v, ...ts },
]

// --- audit / settings ---------------------------------------- ------------
const auditLogs = [
  { id: 'AUD-000001', actorId: 'BOU-TEA-40871', actorRole: 'teacher', organizationId: ORG_A, action: 'REPORT_CREATED', targetId: 'RPT-A-001', targetType: 'report', timestamp: '2026-08-11T08:30:00.000Z', ip: '196.12.0.10', result: 'SUCCESS', metadata: { reference: 'RPT-2026-00031' } },
  { id: 'AUD-000002', actorId: 'BOU-SCH-77120', actorRole: 'school', organizationId: ORG_A, action: 'REPORT_APPROVED', targetId: 'RPT-A-001', targetType: 'report', timestamp: '2026-08-12T10:00:00.000Z', ip: '196.12.0.20', result: 'SUCCESS', metadata: {} },
  { id: 'AUD-000003', actorId: 'BOU-SCH-77120', actorRole: 'school', organizationId: ORG_A, action: 'REQUEST_SUBMITTED', targetId: 'REQ-A-001', targetType: 'request', timestamp: '2026-08-10T09:00:00.000Z', ip: '196.12.0.20', result: 'SUCCESS', metadata: { reference: 'REQ-2026-00042' } },
  { id: 'AUD-000004', actorId: 'BOU-ADM-00001', actorRole: 'admin', organizationId: null, action: 'INVITATION_ISSUED', targetId: 'INV-2026-00001', targetType: 'invitation', timestamp: '2026-08-05T12:00:00.000Z', ip: '10.0.0.1', result: 'SUCCESS', metadata: {} },
]
const settings = [
  { id: 'BOU-STU-10231', ownerId: 'BOU-STU-10231', organizationId: ORG_A, scope: 'user', values: { emailUpdates: true, sessionReminders: true, compactMode: false, publicProfile: true, theme: 'system' }, version: 1, updatedAt: T0 },
  { id: ORG_A, ownerId: 'BOU-SCH-77120', organizationId: ORG_A, scope: 'school', values: { academicYear: '2026', gradingScale: 'A–F (100 pt)', attendanceThreshold: 75, autoApproveReports: false, theme: 'system' }, version: 1, updatedAt: T0 },
  { id: 'BOU-ADM-00001', ownerId: 'BOU-ADM-00001', organizationId: null, scope: 'platform', values: { maintenanceMode: false, allowRegistration: false, sessionTimeoutMinutes: 480, theme: 'system' }, version: 1, updatedAt: T0 },
]

const collections: Record<string, unknown[]> = {
  organizations, users, students, teachers, mentors, mentorAssignments, classes, subjects,
  enrollments, academicRecords, attendance, faculties, departments, programs, courses,
  reports, requests, transferRequests,
  recordRequests, recordGrants, consents, campaigns, campaignSubmissions,
  assessmentSchemes, assessments, reportCards, interventions, guardianLinks,
  timetableSlots, applications, feeStructures, scholarships, invoices, payments,
  sessions, conversations, messages, notifications,
  documents, announcements, credentials, invitations, auditLogs, settings, authSessions: [],
}

for (const [name, rows] of Object.entries(collections)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(rows, null, 2) + '\n')
}
console.log(`Wrote ${Object.keys(collections).length} seed collections to ${OUT}`)
console.log(`demo123 -> scrypt(salt=bou-demo-salt-fixed)`)
console.log(`Pending invitation token: ${inviteTokenPending}`)
