'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/hr/ui/card'
import { Badge } from '@/components/hr/ui/badge'
import { Skeleton } from '@/components/hr/ui/skeleton'
import { companiesApi, dashboardApi, employeesApi } from '@/lib/hr/api'
import { formatCurrency, formatPercent } from '@/lib/hr/utils'
import type { Company } from '@/lib/hr/types'

interface CompanyMetrics {
  id: string
  name_en: string
  employee_count: number
  monthly_payroll: number
  attendance_rate: number
  pending_issues: number
}

export default function CompanyDashboardsPage() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

  const { data: companiesData, isLoading: loadingCompanies } = useQuery<{ data: { results: Company[] } }>({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const { data: comparisonData, isLoading: loadingComparison } = useQuery<{ data: CompanyMetrics[] }>({
    queryKey: ['company-comparison'],
    queryFn: () => dashboardApi.companyComparison(),
  })

  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees-by-company', selectedCompany],
    queryFn: () => employeesApi.list(selectedCompany ? { company: selectedCompany, page_size: 100 } : { page_size: 100 }),
    enabled: selectedCompany !== null,
  })

  const companies = companiesData?.data?.results ?? []
  const metrics: CompanyMetrics[] = (comparisonData?.data as unknown as CompanyMetrics[]) ?? []
  const employees = (employeesData?.data as { results?: unknown[] })?.results ?? []

  const getMetrics = (companyId: string) =>
    metrics.find((m) => String(m.id) === companyId) ?? null

  const isLoading = loadingCompanies || loadingComparison

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Dashboards"
        description="Per-company breakdown of headcount, payroll, and attendance"
        breadcrumbs={[
          { label: 'Management', href: '/management' },
          { label: 'Company Dashboards' },
        ]}
      />

      {/* Company Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading
          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)
          : companies.map((company) => {
              const m = getMetrics(company.id)
              const isSelected = selectedCompany === company.id
              const attRate = m?.attendance_rate ?? 0
              return (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompany(isSelected ? null : company.id)}
                  className={`text-left w-full rounded-xl border p-5 transition-all shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-brand-navy ring-2 ring-brand-navy/20 bg-brand-navy/5'
                      : 'border-border bg-card hover:border-border'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-brand-navy/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-brand-navy" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{company.name_en}</p>
                        {company.name_ar && (
                          <p className="text-xs text-muted-foreground dir-rtl">{company.name_ar}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m && m.pending_issues > 0 && (
                        <Badge variant="warning" className="text-[10px]">
                          {m.pending_issues} issues
                        </Badge>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Headcount</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {m?.employee_count ?? '—'}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Monthly Payroll</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {m ? formatCurrency(m.monthly_payroll) : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Attendance Rate</span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          attRate >= 90
                            ? 'text-emerald-600'
                            : attRate >= 75
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }`}
                      >
                        {m ? formatPercent(attRate) : '—'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          attRate >= 90
                            ? 'bg-emerald-500'
                            : attRate >= 75
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(attRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })}
      </div>

      {/* Employee List for Selected Company */}
      {selectedCompany !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-navy" />
              Employees —{' '}
              {companies.find((c) => c.id === selectedCompany)?.name_en ?? 'Company'}
              {loadingEmployees && (
                <span className="text-sm font-normal text-muted-foreground ml-2">Loading...</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmployees ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No employees found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Department</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Position</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Base Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employees as Array<{
                      employee_id: string
                      full_name_en: string
                      department_name?: string
                      position_en: string
                      status: string
                      base_salary: number
                      currency: string
                    }>).map((emp) => (
                      <tr key={emp.employee_id} className="border-b border-slate-50 hover:bg-muted/50">
                        <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{emp.employee_id}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{emp.full_name_en}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{emp.department_name || '—'}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{emp.position_en}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              emp.status === 'active' ? 'success'
                              : emp.status === 'probation' ? 'warning'
                              : 'danger'
                            }
                            className="text-[10px]"
                          >
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {formatCurrency(emp.base_salary)} {emp.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state if no companies */}
      {!isLoading && companies.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No companies found</p>
          <p className="text-muted-foreground text-sm mt-1">Add companies in Settings → Companies</p>
        </div>
      )}
    </div>
  )
}
