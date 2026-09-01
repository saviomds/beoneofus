import { api } from '@/lib/api'
import type { AcademicRecord, AttendanceRecord, AttendanceStatus, Id, Student } from '@shared/types'

type A = unknown

export function gradeLetter(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export const teacherService = {
  roster: (_a: A, classId: Id) => api.get<Student[]>(`/classes/${classId}/roster`),
  attendanceForDate: (_a: A, classId: Id, date: string) =>
    api.get<AttendanceRecord[]>(`/classes/${classId}/attendance`, { date }),
  recordAttendance: (_a: A, classId: Id, date: string, entries: { studentId: Id; status: AttendanceStatus }[]) =>
    api.post(`/classes/${classId}/attendance`, { date, entries }),
  addGrade: (_a: A, input: Record<string, unknown>) => api.post<AcademicRecord>('/academic', input),
}
