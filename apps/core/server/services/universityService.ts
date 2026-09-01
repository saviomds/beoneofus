import { facultiesRepo, departmentsRepo, programsRepo, coursesRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, loadOrgs, actingOrgId } from './_shared'
import { NotFoundError } from '../lib/errors'
import type { Course, Department, Faculty, Id, Program, SafeUser } from '@shared/types'

async function scoped<T extends { organizationId: Id }>(actor: SafeUser, rows: T[]): Promise<T[]> {
  return actor.role === 'admin' ? rows : scopeRows(actor, rows, await loadOrgs())
}

export const universityService = {
  async faculties(actor: SafeUser): Promise<Faculty[]> {
    assertPermission(actor, P.INSTITUTION_VIEW)
    return scoped(actor, (await facultiesRepo.list()) as Faculty[])
  },
  async createFaculty(actor: SafeUser, input: { name: string; code: string; deanName?: string }): Promise<Faculty> {
    assertPermission(actor, P.UNIVERSITY_MANAGE)
    const organizationId = actingOrgId(actor)
    const f = (await facultiesRepo.create({ organizationId, name: input.name, code: input.code, deanName: input.deanName ?? '' }, actor.id)) as Faculty
    await auditService.record({ actor, action: 'FACULTY_CREATED', targetId: f.id, targetType: 'faculty', organizationId })
    return f
  },

  async departments(actor: SafeUser, facultyId?: Id): Promise<Department[]> {
    assertPermission(actor, P.INSTITUTION_VIEW)
    let rows = await scoped(actor, (await departmentsRepo.list()) as Department[])
    if (facultyId) rows = rows.filter((d) => d.facultyId === facultyId)
    return rows
  },
  async createDepartment(actor: SafeUser, input: { facultyId: Id; name: string; code: string; headName?: string }): Promise<Department> {
    assertPermission(actor, P.UNIVERSITY_MANAGE)
    const organizationId = actingOrgId(actor)
    const fac = (await facultiesRepo.get(input.facultyId)) as Faculty | null
    if (!fac) throw new NotFoundError('Faculty')
    assertTenant(actor, fac, await loadOrgs())
    const d = (await departmentsRepo.create({ organizationId, facultyId: input.facultyId, name: input.name, code: input.code, headName: input.headName ?? '' }, actor.id)) as Department
    await auditService.record({ actor, action: 'DEPARTMENT_CREATED', targetId: d.id, targetType: 'department', organizationId })
    return d
  },

  async programs(actor: SafeUser, departmentId?: Id): Promise<Program[]> {
    assertPermission(actor, P.INSTITUTION_VIEW)
    let rows = await scoped(actor, (await programsRepo.list()) as Program[])
    if (departmentId) rows = rows.filter((p) => p.departmentId === departmentId)
    return rows
  },
  async createProgram(actor: SafeUser, input: { departmentId: Id; name: string; code: string; durationYears?: number; studyCode?: string }): Promise<Program> {
    assertPermission(actor, P.UNIVERSITY_MANAGE)
    const organizationId = actingOrgId(actor)
    const dep = (await departmentsRepo.get(input.departmentId)) as Department | null
    if (!dep) throw new NotFoundError('Department')
    assertTenant(actor, dep, await loadOrgs())
    const p = (await programsRepo.create({
      organizationId, departmentId: input.departmentId, name: input.name, code: input.code,
      level: 'UNIVERSITY', durationYears: input.durationYears ?? 4, studyCode: input.studyCode ?? input.code,
    }, actor.id)) as Program
    await auditService.record({ actor, action: 'PROGRAM_CREATED', targetId: p.id, targetType: 'program', organizationId })
    return p
  },

  async courses(actor: SafeUser, programId?: Id): Promise<Course[]> {
    assertPermission(actor, P.INSTITUTION_VIEW)
    let rows = await scoped(actor, (await coursesRepo.list()) as Course[])
    if (programId) rows = rows.filter((c) => c.programId === programId)
    return rows
  },
  async createCourse(actor: SafeUser, input: { programId: Id; name: string; code: string; credits?: number; year?: number; semester?: number }): Promise<Course> {
    assertPermission(actor, P.UNIVERSITY_MANAGE)
    const organizationId = actingOrgId(actor)
    const prog = (await programsRepo.get(input.programId)) as Program | null
    if (!prog) throw new NotFoundError('Program')
    assertTenant(actor, prog, await loadOrgs())
    const c = (await coursesRepo.create({
      organizationId, programId: input.programId, name: input.name, code: input.code,
      credits: input.credits ?? 3, year: input.year ?? 1, semester: input.semester ?? 1,
    }, actor.id)) as Course
    await auditService.record({ actor, action: 'COURSE_CREATED', targetId: c.id, targetType: 'course', organizationId })
    return c
  },
}
