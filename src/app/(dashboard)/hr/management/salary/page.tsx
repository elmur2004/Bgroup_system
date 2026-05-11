'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/hr/ui/card'
import { StatCard } from '@/components/hr/shared/StatCard'
import { Skeleton } from '@/components/hr/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/hr/ui/select'
import { dashboardApi, payrollApi, companiesApi } from '@/lib/hr/api'
import { formatCurrency } from '@/lib/hr/utils'
import type { Company } from '@/lib/hr/types'

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]
const NOW = new Date()
const CURRENT_YEAR = NOW.getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i)

interface GroupMetrics {
  total_employees: number
  total_companies: number
  total_monthly_payroll: number
  average_attendance_rate: number
}

interface CompanyMetrics {
  id: number
  name_en: string
  employee_count: number
  monthly_payroll: number
}

interface MonthlyTrend {
  month: string
  total_salary: number
  headcount: number
}

interface DeptBreakdown {
  department_name: string
  base_salary: number
  overtime: number
  bonuses: number
  deductions: number
  net_salary: number
}

export default function SalaryOverviewPage() {
  const [month, setMonth] = useState(NOW.getMonth() + 1)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [companyId, setCompanyId] = useState<string>('all')

  const { data: companiesData } = useQuery<{ data: { results: Company[] } }>({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  const { data: groupData, isLoading: loadingGroup } = useQuery({
    queryKey: ['group-metrics'],
    queryFn: () => dashboardApi.groupMetrics(),
  })

  const { data: comparisonData, isLoading: loadingComparison } = useQuery({
    queryKey: ['company-comparison'],
    queryFn: () => dashboardApi.companyComparison(),
  })

  const { data: trendData, isLoading: loadingTrend } = useQuery({
    queryKey: ['monthly-trend', companyId],
    queryFn: () => payrollApi.monthlyTrend(companyId !== 'all' ? { company: companyId } : undefined),
  })

  const { data: deptData, isLoading: loadingDept } = useQuery({
    queryKey: ['dept-breakdown', month, year, companyId],
    queryFn: () =>
      payrollApi.departmentBreakdown({
        month,
        year,
        ...(companyId !== 'all' ? { company: companyId } : {}),
      }),
  })

  const companies = companiesData?.data?.results ?? []
  const metrics = groupData?.data as GroupMetrics | undefined
  const comparison = (comparisonData?.data as unknown as CompanyMetrics[]) ?? []
  const trend = (trendData?.data as unknown as MonthlyTrend[]) ?? []
  const deptBreakdown = (deptData?.data as unknown as DeptBreakdown[]) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Overview"
        description="Group-wide payroll and compensation analysis"
        breadcrumbs={[
          { label: 'Management', href: '/management' },
          { label: 'Salary Overview' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Monthly Payroll"
          value={formatCurrency(metrics?.total_monthly_payroll ?? 0)}
          subtext="All companies combined"
          icon={<DollarSign className="h-6 w-6" />}
          color="navy"
          loading={loadingGroup}
        />
        <StatCard
          label="Total Headcount"
          value={metrics?.total_employees ?? 0}
          subtext={`Across ${metrics?.total_companies ?? 0} companies`}
          icon={<Users className="h-6 w-6" />}
          color="emerald"
          loading={loadingGroup}
        />
        <StatCard
          label="Avg. Salary / Employee"
          value={
            metrics && metrics.total_employees > 0
              ? formatCurrency(metrics.total_monthly_payroll / metrics.total_employees)
              : '—'
          }
          subtext="Group average"
          icon={<TrendingUp className="h-6 w-6" />}
          color="amber"
          loading={loadingGroup}
        />
      </div>

      {/* Payroll by Company + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll by Company */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-navy" />
              Payroll by Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComparison ? (
              <Skeleton className="h-56 w-full rounded" />
            ) : comparison.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={comparison}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 90, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="name_en"
                    type="category"
                    tick={{ fontSize: 11, fill: '#374151' }}
                    width={85}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="monthly_payroll" name="Monthly Payroll" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 6-Month Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>6-Month Payroll Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <Skeleton className="h-56 w-full rounded" />
            ) : trend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="total_salary"
                    name="Total Payroll"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    dot={{ fill: '#1e3a5f', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Department Salary Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDept ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : deptBreakdown.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No payroll data for this period. Run payroll calculation first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Department</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Base</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Overtime</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Bonuses</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Deductions</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {deptBreakdown.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-muted/50">
                      <td className="py-2.5 px-3 font-medium text-foreground">{row.department_name || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-foreground">{formatCurrency(row.base_salary)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-600">{row.overtime > 0 ? formatCurrency(row.overtime) : '—'}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600">{row.bonuses > 0 ? formatCurrency(row.bonuses) : '—'}</td>
                      <td className="py-2.5 px-3 text-right text-red-500">{row.deductions > 0 ? formatCurrency(row.deductions) : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-brand-navy">{formatCurrency(row.net_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
