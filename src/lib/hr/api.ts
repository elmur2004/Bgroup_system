import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'
import Cookies from 'js-cookie'
import { clearUser } from '@/lib/hr/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/hr'

// ─── Token Keys ──────────────────────────────────────────────────────────────

export const ACCESS_TOKEN_KEY = 'bghr_access'
export const REFRESH_TOKEN_KEY = 'bghr_refresh'

// ─── Token Helpers ────────────────────────────────────────────────────────────

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string, remember = false): void {
  const opts = remember ? { expires: 30 } : undefined
  Cookies.set(ACCESS_TOKEN_KEY, access, opts)
  Cookies.set(REFRESH_TOKEN_KEY, refresh, opts)
}

export function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_KEY)
  Cookies.remove(REFRESH_TOKEN_KEY)
  Cookies.remove('bghr_user')
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true, // Send httpOnly cookies automatically
})

// ─── Request Interceptor ─────────────────────────────────────────────────────

// Auth endpoints that must never send an existing token (avoids 401 loop on login)
const AUTH_SKIP_URLS = ['/auth/login/', '/auth/refresh/', '/auth/password-reset/']

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // For FormData, remove Content-Type so the browser sets it with the correct multipart boundary
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }
    // httpOnly cookies are sent automatically via withCredentials
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor (Token Refresh) ────────────────────────────────────

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token as string)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Skip refresh for auth endpoints
    const isAuthEndpoint = AUTH_SKIP_URLS.some((u) => originalRequest.url?.includes(u))

    // If 401 and not already retrying and not an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Server reads refresh token from httpOnly cookie automatically
        await axios.post(`${BASE_URL}/auth/refresh/`, {}, { withCredentials: true })

        // Retry queued requests
        processQueue(null, 'refreshed')

        // Retry the original request (new access cookie is set by server)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        clearUser()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api

// ─── API Endpoint Groups ──────────────────────────────────────────────────────

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/', data),
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  refresh: (refresh: string) => api.post('/auth/refresh/', { refresh }),
  me: () => api.get('/auth/me/'),
  forgotPassword: (email: string) => api.post('/auth/password-reset/', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/password-reset/confirm/', { token, password }),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/password/change/', data),
}

export const companiesApi = {
  list: () => api.get('/companies/'),
  get: (id: string) => api.get(`/companies/${id}/`),
  create: (data: unknown) => api.post('/companies/', data),
  update: (id: string, data: unknown) => api.patch(`/companies/${id}/`, data),
}

export const departmentsApi = {
  list: (params?: unknown) => api.get('/departments/', { params }),
  get: (id: string) => api.get(`/departments/${id}/`),
  create: (data: unknown) => api.post('/departments/', data),
  update: (id: string, data: unknown) => api.patch(`/departments/${id}/`, data),
}

export const employeesApi = {
  list: (params?: unknown) => api.get('/employees/', { params }),
  get: (id: string) => api.get(`/employees/${id}/`),
  create: (data: FormData | unknown) => api.post('/employees/', data),
  update: (id: string, data: FormData | unknown) => api.patch(`/employees/${id}/`, data),
  delete: (id: string) => api.delete(`/employees/${id}/`),
  bulkImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/employees/bulk-import/', form)
  },
  terminate: (id: string, data: unknown) => api.post(`/employees/${id}/terminate/`, data),
}

export const attendanceApi = {
  list: (params?: unknown) => api.get('/attendance/', { params }),
  get: (id: string) => api.get(`/attendance/${id}/`),
  today: (params?: unknown) => api.get('/attendance/today/', { params }),
  summary: (params?: unknown) => api.get('/attendance/summary/', { params }),
  create: (data: unknown) => api.post('/attendance/', data),
  update: (id: string, data: unknown) => api.patch(`/attendance/${id}/`, data),
  bulkImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/attendance/bulk-import/', form)
  },
}

export const overtimeApi = {
  list: (params?: unknown) => api.get('/overtime/', { params }),
  get: (id: string) => api.get(`/overtime/${id}/`),
  create: (data: unknown) => api.post('/overtime/', data),
  approve: (id: string) => api.post(`/overtime/${id}/approve/`),
  deny: (id: string, reason: string) => api.post(`/overtime/${id}/deny/`, { reason }),
  cancel: (id: string) => api.post(`/overtime/${id}/cancel/`),
}

export const incidentsApi = {
  list: (params?: unknown) => api.get('/incidents/incidents/', { params }),
  get: (id: string) => api.get(`/incidents/incidents/${id}/`),
  create: (data: unknown) => api.post('/incidents/incidents/', data),
  update: (id: string, data: unknown) => api.patch(`/incidents/incidents/${id}/`, data),
  resolve: (id: string, data: unknown) => api.post(`/incidents/incidents/${id}/resolve/`, data),
  violationRules: () => api.get('/incidents/violation-rules/'),
}

export const bonusesApi = {
  list: (params?: unknown) => api.get('/bonuses/bonuses/', { params }),
  get: (id: string) => api.get(`/bonuses/bonuses/${id}/`),
  create: (data: unknown) => api.post('/bonuses/bonuses/', data),
  approve: (id: string) => api.post(`/bonuses/bonuses/${id}/approve/`),
  cancel: (id: string) => api.post(`/bonuses/bonuses/${id}/cancel/`),
  rules: () => api.get('/bonuses/rules/'),
}

export const payrollApi = {
  list: (params?: unknown) => api.get('/payroll/', { params }),
  get: (id: string) => api.get(`/payroll/${id}/`),
  summary: (params?: unknown) => api.get('/payroll/summary/', { params }),
  calculate: (params: { month: number; year: number; company?: number }) =>
    api.post('/payroll/calculate/', params),
  lock: (params: { month: number; year: number; company?: number }) =>
    api.post('/payroll/lock/', params),
  departmentBreakdown: (params?: unknown) =>
    api.get('/payroll/department-breakdown/', { params }),
  monthlyTrend: (params?: unknown) => api.get('/payroll/monthly-trend/', { params }),
  exportExcel: (params?: unknown) =>
    api.get('/reports/export-excel/', { params, responseType: 'blob' }),
  exportPdf: (params?: unknown) =>
    api.get('/reports/generate-pdf/', { params, responseType: 'blob' }),
  slipPdf: (id: string) =>
    api.get(`/payroll/${id}/slip/`, { responseType: 'blob' }),
}

export const dashboardApi = {
  metrics: (params?: unknown) => api.get('/dashboard/metrics/', { params }),
  attendanceWidget: (params?: unknown) => api.get('/dashboard/attendance-widget/', { params }),
  recentIncidents: (params?: unknown) => api.get('/dashboard/recent-incidents/', { params }),
  alerts: (params?: unknown) => api.get('/dashboard/alerts/', { params }),
  groupMetrics: () => api.get('/dashboard/group-metrics/'),
  companyComparison: () => api.get('/dashboard/company-comparison/'),
}

export const notificationsApi = {
  list: (params?: unknown) => api.get('/notifications/', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
  unreadCount: () => api.get('/notifications/unread-count/'),
}
