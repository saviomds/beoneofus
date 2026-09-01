import { api } from '@/lib/api'
import type { GovScope, Id } from '@shared/types'

type A = unknown

interface GovAnalytics {
  overview: {
    institutions: number
    activeInstitutions: number
    students: number
    teachers: number
    mentors: number
    attendanceRate: number
    academicAverage: number
    districts: number
  }
  perSchool: {
    organizationId: Id
    name: string
    district: string
    province: string
    type: string
    status: string
    students: number
    teachers: number
    attendanceRate: number
    academicAverage: number
  }[]
  byDistrict: { district: string; schools: number; students: number; attendanceRate: number }[]
}

let cache: { at: number; data: GovAnalytics } | null = null
async function load(): Promise<GovAnalytics> {
  if (cache && Date.now() - cache.at < 3000) return cache.data
  const data = await api.get<GovAnalytics>('/analytics/government')
  cache = { at: Date.now(), data }
  return data
}

export const governmentService = {
  overview: async (_a: A) => (await load()).overview,
  schoolStats: async (_a: A) =>
    (await load()).perSchool.map((s) => ({
      schoolId: s.organizationId,
      name: s.name,
      district: s.district,
      students: s.students,
      teachers: s.teachers,
      attendanceRate: s.attendanceRate,
      academicAverage: s.academicAverage,
      openRequests: 0,
      status: s.status,
    })),
  byDistrict: async (_a: A) => (await load()).byDistrict,
  body: async (_a: A) => {
    const scope: GovScope | null = null
    void scope
    return api.get<import('@shared/types').Organization | null>('/organizations/mine')
  },
}
