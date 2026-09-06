'use client'

import { useCallback, useEffect, useState } from 'react'
import * as apps from '../services/applicationService'
import type { NotificationItem } from '../types'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const load = useCallback(() => {
    setNotifications(userId ? apps.listNotificationsForUser(userId) : [])
  }, [userId])

  useEffect(() => { load() }, [load])

  const markRead = useCallback((id: string) => {
    apps.markNotificationRead(id)
    load()
  }, [load])

  const markAllRead = useCallback(() => {
    if (userId) apps.markAllNotificationsRead(userId)
    load()
  }, [userId, load])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markRead, markAllRead, refresh: load }
}
