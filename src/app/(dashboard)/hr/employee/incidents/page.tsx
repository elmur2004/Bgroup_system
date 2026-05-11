'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Badge } from '@/components/hr/ui/badge'
import { Loader2 } from 'lucide-react'
import api from '@/lib/hr/api'
import { formatDate, formatCurrency } from '@/lib/hr/utils'

interface MyIncident {
  id: number
  type: 'deduction'
  incident_date: string
  category: string
  rule_name: string
  comments: string
  deduction_amount: number
  offense_number: number
  status: string
}

interface MyBonus {
  id: number
  type: 'bonus'
  bonus_date: string
  category: string
  rule_name: string
  reason: string
  bonus_amount: number
  status: string
}

type TimelineEntry = (MyIncident | MyBonus) & { _date: string }

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function MyIncidentsPage() {
  const { data: incidentsData, isLoading: incidentsLoading } = useQuery<{ data: { results: MyIncident[] } }>({
    queryKey: ['my-incidents'],
    queryFn: () => api.get('/incidents/my-incidents/'),
    retry: 1,
  })
  const incidents = (incidentsData?.data?.results ?? []).map((i) => ({ ...i, type: 'deduction' as const, _date: i.incident_date }))

  const { data: bonusesData, isLoading: bonusesLoading } = useQuery<{ data: { results: MyBonus[] } }>({
    queryKey: ['my-bonuses'],
    queryFn: () => api.get('/bonuses/my-bonuses/'),
    retry: 1,
  })
  const bonuses = (bonusesData?.data?.results ?? []).map((b) => ({ ...b, type: 'bonus' as const, _date: b.bonus_date }))

  const isLoading = incidentsLoading || bonusesLoading

  const timeline: TimelineEntry[] = [...incidents, ...bonuses].sort(
    (a, b) => new Date(b._date).getTime() - new Date(a._date).getTime()
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Loading records...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Incidents & Bonuses"
        description="Your complete record of deductions and bonuses"
        breadcrumbs={[{ label: 'My Incidents & Bonuses' }]}
      />

      {timeline.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
          No incidents or bonuses recorded yet.
        </div>
      )}

      {timeline.length > 0 && (
        <div className="space-y-3">
          {timeline.map((entry) => {
            const isDeduction = entry.type === 'deduction'
            const incident = isDeduction ? (entry as MyIncident & { _date: string }) : null
            const bonus = !isDeduction ? (entry as MyBonus & { _date: string }) : null

            return (
              <div
                key={`${entry.type}-${entry.id}`}
                className={`bg-card rounded-lg border border-border overflow-hidden flex ${
                  isDeduction ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-emerald-400'
                }`}
              >
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Date badge */}
                      <div className="flex flex-col items-center bg-muted rounded px-2.5 py-1.5 text-center min-w-[52px]">
                        <span className="text-xs text-muted-foreground font-medium leading-none">
                          {new Date(entry._date).toLocaleString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-foreground leading-tight">
                          {new Date(entry._date).getDate()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry._date).getFullYear()}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={isDeduction ? 'danger' : 'success'}
                            className="text-xs"
                          >
                            {isDeduction ? 'Deduction' : 'Bonus'}
                          </Badge>
                          {entry.category && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              {entry.category}
                            </span>
                          )}
                          {isDeduction && incident && (
                            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">
                              {ordinal(incident.offense_number)} offense
                            </span>
                          )}
                          {!isDeduction && bonus && (
                            <Badge
                              variant={bonus.status === 'applied' ? 'success' : bonus.status === 'pending' ? 'warning' : 'default'}
                              className="text-xs capitalize"
                            >
                              {bonus.status === 'applied' ? 'Applied' : bonus.status === 'pending' ? 'Pending' : bonus.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {isDeduction
                            ? (incident?.rule_name ?? '—')
                            : (bonus?.rule_name ?? '—')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isDeduction
                            ? (incident?.comments ?? '')
                            : (bonus?.reason ?? '')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-xl font-bold ${isDeduction ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isDeduction ? '-' : '+'}{formatCurrency(
                          isDeduction ? (incident?.deduction_amount ?? 0) : (bonus?.bonus_amount ?? 0)
                        )}
                      </p>
                      {isDeduction && incident && (
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{incident.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
