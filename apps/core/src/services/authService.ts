import { api } from '@/lib/api'

/** Auth calls that pages use directly (login/logout/support view live in AuthContext). */
export const authService = {
  changePassword: (_actor: unknown, currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  rotateCode: async (_actor: unknown): Promise<string> =>
    (await api.post<{ code: string }>('/auth/rotate-code')).code,
  requestPasswordReset: (code: string) =>
    api.post<{ token: string; delivered: false }>('/auth/forgot-password', { code }),
}
