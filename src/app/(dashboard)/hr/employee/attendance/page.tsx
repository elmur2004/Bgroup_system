'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { StatCard } from '@/components/hr/shared/StatCard'
import CheckInOut from '@/components/hr/attendance/CheckInOut'
import { Badge } from '@/components/hr/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/hr/ui/select'
import api from '@/lib/hr/api'
import { formatDate, cn } from '@/lib/hr/utils'
import type { AttendanceLog } from '@/lib/hr/types'
import { CalendarDays, Clock, TrendingUp, AlertTriangle, UserX } from 'lucide-react'

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i)

interface MyAttendanceSummary {
  attendance_rate: number
  total_hours: number
  days_present: number
  late_count: number
  absent_days: number
}

const STATUS_CONFIG: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  on_time: { variant: 'success', label: 'On Time' },
  late: { variant: 'warning', label: 'Late' },
  absent: { variant: 'danger', label: 'Absent' },
  leave: { variant: 'info', label: 'On Leave' },
  holiday: { variant: 'default', label: 'Holiday' },
  weekend: { variant: 'default', label: 'Weekend' },
}

function getRowColor(status: string): string {
  switch (status) {
    case 'on_time': return 'bg-emerald-50/50'
    case 'late': return 'bg-amber-50/50'
    case 'absent': return 'bg-red-50/50'
    case 'leave': return 'bg-blue-50/50'
    case 'holiday': return 'bg-purple-50/50'
    case 'weekend': return 'bg-muted/50'
    default: return ''
  }
}

export default function MyAttendancePage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const { data: summaryData } = useQuery<{ data: MyAttendanceSummary }>({
    queryKey: ['my-attendance-summary', month, year],
    queryFn: () =>
      api.get('/attendance/my-summary/', { params: { month, year } }),
  })
  const summary = summaryData?.data

  const { data: logsData, isLoading } = useQuery<{ data: { results: AttendanceLog[] } }>({
    queryKey: ['my-attendance-logs', month, year],
    queryFn: () =>
      api.get('/attendance/my-logs/', { params: { month, year } }),
  })
  const logs = logsData?.data?.results ?? []

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="View your attendance records and check in/out"
        breadcrumbs={[{ label: 'My Attendance' }]}
      />

      {/* Check In/Out */}
      <CheckInOut />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Attendance Rate"
          value={summary ? `${summary.attendance_rate.toFixed(1)}%` : '—'}
          icon={<TrendingUp className="h-5 w-5" />}
          color={summary && summary.attendance_rate >= 90 ? 'emerald' : 'amber'}
        />
        <StatCard
          label="Total Hours"
          value={summary ? `${summary.total_hours.toFixed(0)}h` : '—'}
          icon={<Clock className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Days Present"
          value={summary?.days_present ?? '—'}
          icon={<CalendarDays className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          label="Late Count"
          value={summary?.late_count ?? '—'}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={summary && summary.late_count > 3 ? 'red' : 'amber'}
        />
        <StatCard
          label="Absent Days"
          value={summary?.absent_days ?? '—'}
          icon={<UserX className="h-5 w-5" />}
          color={summary && summary.absent_days > 0 ? 'red' : 'blue'}
        />
      </div>

      {/* Month/Year selector */}
      <div className="flex items-center gap-3 bg-card rounded-lg border border-border p-4">
        <label className="text-sm font-medium text-muted-foreground">Period:</label>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading attendance records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No attendance records for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Date', 'Day', 'Check In', 'Check Out', 'Status', 'Hours Worked', 'OT Hours', 'Late (min)', 'Notes'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const date = new Date(log.date)
                  const dayName = DAY_NAMES[date.getDay()]
                  const statusConfig = STATUS_CONFIG[log.status] ?? { variant: 'default' as const, label: log.status }

                  return (
                    <tr key={log.id} className={cn('hover:brightness-95 transition-all', getRowColor(log.status))}>
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs font-medium">{dayName}</td>
                      <td className="px-4 py-2.5 font-mono text-foreground">
                        {log.check_in ? log.check_in.slice(0, 5) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-foreground">
                        {log.check_out ? log.check_out.slice(0, 5) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusConfig.variant} className="text-xs capitalize">
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {log.hours_worked > 0 ? `${log.hours_worked.toFixed(1)}h` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {log.overtime_hours > 0 ? (
                          <span className="text-blue-600 font-medium">{log.overtime_hours.toFixed(1)}h</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-foreground">
                        {log.late_minutes > 0 ? (
                          <span className="text-amber-600 font-medium">{log.late_minutes}m</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{log.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
