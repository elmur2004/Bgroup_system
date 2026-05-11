'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Eye, AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Button } from '@/components/hr/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/hr/ui/avatar'
import { Badge } from '@/components/hr/ui/badge'
import api from '@/lib/hr/api'
import { getInitials, capitalize, cn } from '@/lib/hr/utils'
import type { Employee, PaginatedResponse } from '@/lib/hr/types'

interface AttendanceToday {
  employee_id: string
  status: 'on_time' | 'late' | 'absent' | 'leave' | 'not_yet' | 'weekend' | 'holiday'
  check_in?: string
}

const ATTENDANCE_CONFIG: Record<string, { label: string; class: string }> = {
  on_time: { label: 'On Time', class: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  late: { label: 'Late', class: 'bg-amber-100 text-amber-700 border border-amber-200' },
  absent: { label: 'Absent', class: 'bg-red-100 text-red-700 border border-red-200' },
  leave: { label: 'On Leave', class: 'bg-blue-100 text-blue-700 border border-blue-200' },
  not_yet: { label: 'Not Checked In', class: 'bg-muted text-muted-foreground border border-border' },
  weekend: { label: 'Weekend', class: 'bg-purple-100 text-purple-700 border border-purple-200' },
  holiday: { label: 'Holiday', class: 'bg-purple-100 text-purple-700 border border-purple-200' },
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  on_leave: 'info',
  probation: 'warning',
  terminated: 'danger',
  suspended: 'danger',
}

export default function TeamPage() {
  const router = useRouter()

  const { data: teamData, isLoading } = useQuery<{ data: PaginatedResponse<Employee> }>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/employees/', { params: { managed_by: 'me', page_size: 100 } }),
  })
  const teamMembers = teamData?.data?.results ?? []

  const { data: attendanceData } = useQuery<{ data: { stats: Record<string, number>; logs: AttendanceToday[] } }>({
    queryKey: ['team-attendance-today'],
    queryFn: () => api.get('/attendance/today/', { params: { managed_by: 'me' } }),
  })
  const attendanceLogs: AttendanceToday[] = attendanceData?.data?.logs ?? []
  const attendanceMap = new Map(attendanceLogs.map((a) => [a.employee_id, a]))

  function getAttendanceStatus(employeeId: string): string {
    return attendanceMap.get(employeeId)?.status ?? 'not_yet'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Loading team...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description={`${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}`}
        breadcrumbs={[{ label: 'Team' }]}
      />

      {teamMembers.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
          No team members assigned to you.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map((member) => {
          const attendanceStatus = getAttendanceStatus(member.id)
          const attConfig = ATTENDANCE_CONFIG[attendanceStatus] ?? ATTENDANCE_CONFIG['not_yet']

          return (
            <div
              key={member.id}
              className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={member.photo ?? undefined} alt={member.full_name_en} />
                  <AvatarFallback className="text-sm font-bold bg-blue-100 text-blue-700">
                    {getInitials(member.full_name_en)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{member.full_name_en}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.position_en}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.department_name}</p>
                </div>
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between gap-2">
                <Badge variant={STATUS_VARIANT[member.status] ?? 'default'} className="text-xs capitalize">
                  {capitalize(member.status)}
                </Badge>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', attConfig.class)}>
                  {attConfig.label}
                </span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 text-foreground"
                  onClick={() => router.push(`/hr/employees/${member.id}`)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => router.push(`/hr/employees/${member.id}?tab=incidents`)}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Incident
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => router.push(`/hr/overtime?employee=${member.id}`)}
                >
                  <Clock className="h-3.5 w-3.5" />
                  OT
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
