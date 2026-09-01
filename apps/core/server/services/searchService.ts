import { studentsRepo, teachersRepo, organizationsRepo, reportsRepo, requestsRepo } from '../lib/db'
import { hasPermission, PERMISSIONS as P } from '@shared/rbac'
import { scopeRows, loadOrgs } from './_shared'
import type { GovRequest, Organization, Report, SafeUser, Student, Teacher } from '@shared/types'

export interface SearchHit { label: string; sub: string; href: string; kind: string }
const has = (v: unknown, q: string) => String(v ?? '').toLowerCase().includes(q)

export const searchService = {
  async query(actor: SafeUser, raw: string): Promise<SearchHit[]> {
    const q = raw.trim().toLowerCase()
    if (q.length < 2) return []
    const orgs = await loadOrgs()
    const hits: SearchHit[] = []

    if (hasPermission(actor, P.STUDENTS_VIEW)) {
      const rows = scopeRows(actor, (await studentsRepo.list()) as Student[], orgs)
      for (const s of rows.filter((s) => has(`${s.firstName} ${s.lastName}`, q) || has(s.institutionStudentNumber, q)).slice(0, 5)) {
        hits.push({ label: `${s.firstName} ${s.lastName}`, sub: `Student · ${s.institutionStudentNumber}`, href: `/${actor.role}/students`, kind: 'Student' })
      }
    }
    if (hasPermission(actor, P.TEACHERS_VIEW)) {
      const rows = scopeRows(actor, (await teachersRepo.list()) as Teacher[], orgs)
      for (const t of rows.filter((t) => has(`${t.firstName} ${t.lastName}`, q)).slice(0, 4)) {
        hits.push({ label: `${t.firstName} ${t.lastName}`, sub: `Teacher · ${t.subjects.join(', ')}`, href: `/${actor.role}/teachers`, kind: 'Teacher' })
      }
    }
    if (hasPermission(actor, P.SCHOOLS_VIEW) || hasPermission(actor, P.INSTITUTION_VIEW)) {
      const rows = (await organizationsRepo.list()) as Organization[]
      const visible = actor.role === 'admin' || actor.role === 'government' ? rows : rows.filter((o) => o.id === actor.organizationId)
      for (const o of visible.filter((o) => has(o.officialName, q) || has(o.district, q)).slice(0, 4)) {
        hits.push({ label: o.officialName, sub: `Institution · ${o.district}`, href: `/${actor.role === 'admin' ? 'admin' : 'government'}/schools`, kind: 'Institution' })
      }
    }
    if (hasPermission(actor, P.REPORTS_VIEW)) {
      const rows = scopeRows(actor, (await reportsRepo.list()) as Report[], orgs)
      for (const r of rows.filter((r) => has(r.subject, q) || has(r.reference, q)).slice(0, 4)) {
        hits.push({ label: r.subject, sub: `Report · ${r.reference}`, href: `/${actor.role}/reports`, kind: 'Report' })
      }
    }
    if (hasPermission(actor, P.REQUESTS_VIEW)) {
      const rows = (await requestsRepo.list()) as GovRequest[]
      const visible = actor.role === 'admin' || actor.role === 'government' ? rows : rows.filter((r) => r.organizationId === actor.organizationId)
      for (const r of visible.filter((r) => has(r.title, q) || has(r.reference, q)).slice(0, 4)) {
        hits.push({ label: r.title, sub: `Request · ${r.reference}`, href: actor.role === 'school' ? '/school/government' : `/${actor.role}/requests`, kind: 'Request' })
      }
    }
    return hits.slice(0, 12)
  },
}
