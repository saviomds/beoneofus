import { api } from '@/lib/api'
import type { Id, Page, Role, SafeUser, UserStatus } from '@shared/types'

type A = unknown

async function rows(p: Promise<Page<SafeUser> | SafeUser[]>): Promise<SafeUser[]> {
  const r = await p
  return Array.isArray(r) ? r : r.rows
}

export const userService = {
  list: (_a: A, q: { role?: Role; status?: UserStatus; organizationId?: Id; search?: string } = {}) =>
    rows(api.get('/admin/users', q as Record<string, unknown>)),
  get: (_a: A, id: Id) => api.get<SafeUser>(`/admin/users/${id}`),
  counts: (_a: A) => api.get<Record<string, number>>('/admin/users/counts'),
  create: (_a: A, input: Record<string, unknown>) => api.post<SafeUser>('/admin/users', input),
  update: (_a: A, id: Id, patch: Record<string, unknown>) => api.patch<SafeUser>(`/admin/users/${id}`, patch),
  setStatus: (_a: A, id: Id, status: UserStatus) => api.post<SafeUser>(`/admin/users/${id}/status`, { status }),
  rolePermissions: async (role: Role) =>
    (await api.get<{ permissions: string[] }>(`/admin/role-permissions/${role}`)).permissions,
}
