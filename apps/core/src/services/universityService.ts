import { api } from '@/lib/api'
import type { Course, Department, Faculty, Id, Program } from '@shared/types'

type A = unknown

export const universityService = {
  faculties: (_a: A) => api.get<Faculty[]>('/university/faculties'),
  createFaculty: (_a: A, input: Record<string, unknown>) => api.post<Faculty>('/university/faculties', input),
  departments: (_a: A, facultyId?: Id) => api.get<Department[]>('/university/departments', facultyId ? { facultyId } : undefined),
  createDepartment: (_a: A, input: Record<string, unknown>) => api.post<Department>('/university/departments', input),
  programs: (_a: A, departmentId?: Id) => api.get<Program[]>('/university/programs', departmentId ? { departmentId } : undefined),
  createProgram: (_a: A, input: Record<string, unknown>) => api.post<Program>('/university/programs', input),
  courses: (_a: A, programId?: Id) => api.get<Course[]>('/university/courses', programId ? { programId } : undefined),
  createCourse: (_a: A, input: Record<string, unknown>) => api.post<Course>('/university/courses', input),
}
