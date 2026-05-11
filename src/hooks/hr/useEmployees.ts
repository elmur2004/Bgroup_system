import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi } from '@/lib/hr/api'
import type { Employee, EmployeeSummary, PaginatedResponse, FilterParams } from '@/lib/hr/types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: FilterParams) => [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
}

// ─── List Hook ────────────────────────────────────────────────────────────────

export function useEmployees(params: FilterParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: async () => {
      const res = await employeesApi.list(params)
      return res.data as PaginatedResponse<EmployeeSummary>
    },
  })
}

// ─── Detail Hook ──────────────────────────────────────────────────────────────

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const res = await employeesApi.get(id)
      return res.data as Employee
    },
    enabled: !!id,
  })
}

// ─── Create Hook ──────────────────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) =>
      employeesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

// ─── Update Hook ──────────────────────────────────────────────────────────────

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData | Record<string, unknown>) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

// ─── Delete Hook ──────────────────────────────────────────────────────────────

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

// ─── Terminate Hook ───────────────────────────────────────────────────────────

export function useTerminateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      employeesApi.terminate(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) })
      qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

// ─── Bulk Import Hook ─────────────────────────────────────────────────────────

export function useBulkImportEmployees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => employeesApi.bulkImport(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}
