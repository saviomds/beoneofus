import { api } from '@/lib/api'
import type { AttendanceRecord, Id } from '@shared/types'

type A = unknown

export const attendanceService = {
  pendingExcuses: (_a?: A) =>
    api.get<(AttendanceRecord & { studentName: string })[]>('/attendance/excuses/pending'),
  requestExcuse: (_a: A, attendanceId: Id, reason: string) =>
    api.post<AttendanceRecord>(`/attendance/${attendanceId}/excuse`, { reason }),
  reviewExcuse: (_a: A, attendanceId: Id, decision: 'approve' | 'reject', note = '') =>
    api.post<AttendanceRecord>(`/attendance/${attendanceId}/excuse/review`, { decision, note }),
}
