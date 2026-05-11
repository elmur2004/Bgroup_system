'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  DollarSign,
  TrendingUp,
  Building2,
  AlertTriangle,
  BarChart3,
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
import { dashboardApi, payrollApi } from '@/lib/hr/api'
import { StatCard } from '@/components/hr/shared/StatCard'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/hr/ui/card'
import { Badge } from '@/components/hr/ui/badge'
import { Skeleton } from '@/components/hr/ui/skeleton'
import { formatCurrency, formatDate, formatPercent } from '@/lib/hr/utils'

interface GroupMetrics {
  total_employees: number
  total_companies: number
  total_monthly_payroll: number
  average_attendance_rate: number
  total_pending_overtime: number
  total_active_incidents: number
  companies: Array<{
    id: number
    name_en: string
    employee_count: number
    monthly_payroll: number
    attendance_rate: number
    pending_issues: number
  }>
}

interface MonthlyTrend {
  month: string
  total_salary: number
  headcount: number
  attendance_rate: number
}

export default function ManagementPage() {
  const groupMetricsQuery = useQuery({
    queryKey: ['group-metrics'],
    queryFn: async () => {
      const res = await dashboardApi.groupMetrics()
      return res.data as GroupMetrics
    },
  })

  const companyComparisonQuery = useQuery({
    queryKey: ['company-comparison'],
    queryFn: async () => {
      const res = await dashboardApi.companyComparison()
      return res.data as GroupMetrics['companies']
    },
  })

  const trendQuery = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const res = await payrollApi.monthlyTrend()
      return res.data as MonthlyTrend[]
    },
  })

  const metrics = groupMetricsQuery.data
  const companies = Array.isArray(companyComparisonQuery.data) ? companyComparisonQuery.data : []
  const trend = trendQuery.data || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Dashboard"
        description={`Executive overview — All subsidiaries — ${formatDate(new Date())}`}
        breadcrumbs={[{ label: 'Management' }]}
      />

      {/* ── Group KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Headcount"
          value={metrics?.total_employees ?? 0}
          subtext={`Across ${metrics?.total_companies ?? 0} companies`}
          icon={<Users className="h-6 w-6" />}
          color="navy"
          loading={groupMetricsQuery.isLoading}
        />
        <StatCard
          label="Group Monthly Payroll"
          value={formatCurrency(metrics?.total_monthly_payroll ?? 0)}
          subtext="Estimated net"
          icon={<DollarSign className="h-6 w-6" />}
          color="emerald"
          loading={groupMetricsQuery.isLoading}
        />
        <StatCard
          label="Avg. Attendance Rate"
          value={formatPercent(metrics?.average_attendance_rate ?? 0)}
          subtext="Group average today"
          icon={<TrendingUp className="h-6 w-6" />}
          color="amber"
          loading={groupMetricsQuery.isLoading}
        />
        <StatCard
          label="Pending OT Requests"
          value={metrics?.total_pending_overtime ?? 0}
          subtext="Awaiting approval group-wide"
          icon={<BarChart3 className="h-6 w-6" />}
          color="blue"
          loading={groupMetricsQuery.isLoading}
        />
      </div>

      {/* ── Company Comparison ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-navy" />
                Company Payroll Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyComparisonQuery.isLoading ? (
                <Skeleton className="h-64 w-full rounded" />
              ) : companies.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={companies}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
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
                      width={75}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'monthly_payroll' ? formatCurrency(Number(value)) : Number(value),
                        name === 'monthly_payroll' ? 'Monthly Payroll' : 'Employees',
                      ]}
                      contentStyle={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="monthly_payroll"
                      name="monthly_payroll"
                      fill="#1e3a5f"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  No company data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Company Cards */}
        <div className="space-y-3">
          {companyComparisonQuery.isLoading
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
            : companies.map((company) => (
                <Card key={company.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{company.name_en}</p>
                      <p className="text-xs text-muted-foreground">{company.employee_count} employees</p>
                    </div>
                    {company.pending_issues > 0 && (
                      <Badge variant="warning" className="text-[10px]">
                        {company.pending_issues} issues
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand-navy">
                      {formatCurrency(company.monthly_payroll)}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        company.attendance_rate >= 90
                          ? 'text-emerald-600'
                          : company.attendance_rate >= 75
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      {formatPercent(company.attendance_rate)} att.
                    </span>
                  </div>
                  {/* Attendance bar */}
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        company.attendance_rate >= 90
                          ? 'bg-emerald-500'
                          : company.attendance_rate >= 75
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${company.attendance_rate}%` }}
                    />
                  </div>
                </Card>
              ))}
        </div>
      </div>

      {/* ── 6-Month Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>6-Month Payroll Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendQuery.isLoading ? (
              <Skeleton className="h-60 w-full rounded" />
            ) : trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
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
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Headcount + Attendance Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Headcount & Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendQuery.isLoading ? (
              <Skeleton className="h-60 w-full rounded" />
            ) : trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Headcount', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="headcount"
                    name="Headcount"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="attendance_rate"
                    name="Attendance %"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts ── */}
      {metrics?.total_active_incidents && metrics.total_active_incidents > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Group-Wide Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              There are{' '}
              <strong>{metrics.total_active_incidents}</strong> open incidents and{' '}
              <strong>{metrics.total_pending_overtime}</strong> pending overtime requests
              across the group that require attention.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
