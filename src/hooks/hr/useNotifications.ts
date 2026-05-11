import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/hr/api'
import type { Notification, PaginatedResponse } from '@/lib/hr/types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: Record<string, unknown>) =>
    [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// ─── List Hook ────────────────────────────────────────────────────────────────

export function useNotifications(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const res = await notificationsApi.list(params)
      return res.data as PaginatedResponse<Notification>
    },
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// ─── Unread Count Hook ────────────────────────────────────────────────────────

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await notificationsApi.unreadCount()
      return res.data as { count: number }
    },
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// ─── Mark Read Hook ───────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// ─── Mark All Read Hook ───────────────────────────────────────────────────────

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}
