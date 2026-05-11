import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/hr/api'
import type {
  AttendanceLog,
  AttendanceSummary,
  AttendanceWidget,
  PaginatedResponse,
  FilterParams,
} from '@/lib/hr/types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const attendanceKeys = {
  all: ['attendance'] as const,
  lists: () => [...attendanceKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...attendanceKeys.lists(), filters] as const,
  today: (params: Record<string, unknown>) =>
    [...attendanceKeys.all, 'today', params] as const,
  summary: (params: Record<string, unknown>) =>
    [...attendanceKeys.all, 'summary', params] as const,
  widget: (params: Record<string, unknown>) =>
    [...attendanceKeys.all, 'widget', params] as const,
}

// ─── List Hook ────────────────────────────────────────────────────────────────

export function useAttendance(params: FilterParams = {}) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: async () => {
      const res = await attendanceApi.list(params)
      return res.data as PaginatedResponse<AttendanceLog>
    },
  })
}

// ─── Today's Attendance Hook ──────────────────────────────────────────────────

export function useTodayAttendance(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: attendanceKeys.today(params),
    queryFn: async () => {
      const res = await attendanceApi.today(params)
      return res.data as AttendanceWidget
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// ─── Attendance Summary Hook ──────────────────────────────────────────────────

export function useAttendanceSummary(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: attendanceKeys.summary(params),
    queryFn: async () => {
      const res = await attendanceApi.summary(params)
      return res.data as AttendanceSummary[]
    },
  })
}

// ─── Create Attendance Hook ───────────────────────────────────────────────────

export function useCreateAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => attendanceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}

// ─── Update Attendance Hook ───────────────────────────────────────────────────

export function useUpdateAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      attendanceApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}

// ─── Bulk Import Hook ─────────────────────────────────────────────────────────

export function useBulkImportAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => attendanceApi.bulkImport(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}
