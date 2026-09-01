import { api } from '@/lib/api'
import type { ClassRecord, Id, Mentor, Organization, Student, Subject, Teacher } from '@shared/types'

type A = unknown

export const directoryService = {
  // institutions (was "schools")
  schools: (_a?: A) => api.get<Organization[]>('/organizations'),
  organizations: (_a?: A) => api.get<Organization[]>('/organizations'),
  schoolForActor: (_a?: A) => api.get<Organization | null>('/organizations/mine'),
  organizationForActor: (_a?: A) => api.get<Organization | null>('/organizations/mine'),
  organization: (_a: A, id: Id) => api.get<Organization>(`/organizations/${id}`),
  updateSchool: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Organization>(`/organizations/${id}`, patch),

  classes: (_a?: A) => api.get<ClassRecord[]>('/classes'),
  classById: (_a: A, id: Id) => api.get<ClassRecord>(`/classes/${id}`),
  createClass: (_a: A, input: Record<string, unknown>) => api.post<ClassRecord>('/classes', input),
  updateClass: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<ClassRecord>(`/classes/${id}`, patch),

  subjects: (_a?: A) => api.get<Subject[]>('/subjects'),
  createSubject: (_a: A, input: Record<string, unknown>) => api.post<Subject>('/subjects', input),

  teachers: (_a?: A) => api.get<Teacher[]>('/teachers'),
  teacherById: (_a: A, id: Id) => api.get<Teacher>(`/teachers/${id}`),
  teacherForUser: (_a?: A, _userId?: Id) => api.get<Teacher | null>('/teachers/me'),
  createTeacher: (_a: A, input: Record<string, unknown>) => api.post<Teacher>('/teachers', input),
  updateTeacher: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<Teacher>(`/teachers/${id}`, patch),
  studentsForTeacher: (id: Id) => api.get<Student[]>(`/teachers/${id}/students`),

  mentors: (_a?: A) => api.get<Mentor[]>('/mentors'),
}
