'use client'

import { useCallback, useEffect, useState } from 'react'
import * as apps from '../services/applicationService'
import type { NotificationItem } from '../types'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const load = useCallback(async () => {
    if (!userId) return
    try {
      setNotifications(await apps.listNotificationsForUser(userId))
    } catch (err) {
      console.error('[study-work] failed to load notifications', err)
    }
  }, [userId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after its awaited fetch resolves
  useEffect(() => { load() }, [load])

  const markRead = useCallback(async (id: string) => {
    await apps.markNotificationRead(id)
    await load()
  }, [load])

  const markAllRead = useCallback(async () => {
    if (userId) await apps.markAllNotificationsRead(userId)
    await load()
  }, [userId, load])

  const visible = userId ? notifications : []
  const unreadCount = visible.filter((n) => !n.read).length

  return { notifications: visible, unreadCount, markRead, markAllRead, refresh: load }
}
