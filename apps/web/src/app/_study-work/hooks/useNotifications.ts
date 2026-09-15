'use client'

import { useCallback, useEffect, useState } from 'react'
import * as apps from '../services/applicationService'
import type { NotificationItem } from '../types'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const load = useCallback(async () => {
    setNotifications(userId ? await apps.listNotificationsForUser(userId) : [])
  }, [userId])

  useEffect(() => { load() }, [load])

  const markRead = useCallback(async (id: string) => {
    await apps.markNotificationRead(id)
    await load()
  }, [load])

  const markAllRead = useCallback(async () => {
    if (userId) await apps.markAllNotificationsRead(userId)
    await load()
  }, [userId, load])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markRead, markAllRead, refresh: load }
}
