'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Button } from '@/components/hr/ui/button'
import { Badge } from '@/components/hr/ui/badge'
import { useToast } from '@/components/hr/ui/toast'
import api from '@/lib/hr/api'
import { formatCurrency, formatMonthYear } from '@/lib/hr/utils'

interface OTEntry {
  date: string
  hours: number
  amount: number
  type: string
}

interface BonusEntry {
  date: string
  name: string
  amount: number
}

interface DeductionEntry {
  date: string
  name: string
  amount: number
}

interface SalarySlip {
  id: number
  month: number
  year: number
  base_salary: number
  overtime_amount: number
  total_bonuses: number
  total_deductions: number
  net_salary: number
  status: string
  ot_entries: OTEntry[]
  bonus_entries: BonusEntry[]
  deduction_entries: DeductionEntry[]
}

export default function MySalaryPage() {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [downloading, setDownloading] = useState<number | null>(null)

  const { data, isLoading } = useQuery<{ data: { results: SalarySlip[] } }>({
    queryKey: ['my-salary-slips'],
    queryFn: () => api.get('/payroll/my-salary-slips/'),
  })
  const slips = data?.data?.results ?? []

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDownload(slip: SalarySlip) {
    setDownloading(slip.id)
    try {
      const res = await api.get('/reports/salary-slip-pdf/', {
        params: { month: slip.month, year: slip.year },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `SalarySlip_${slip.month}_${slip.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Download failed', variant: 'destructive', description: 'Could not download salary slip.' })
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Loading salary slips...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Salary Slips"
        description="View and download your monthly salary statements"
        breadcrumbs={[{ label: 'My Salary' }]}
      />

      {slips.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-muted-foreground">
          No salary slips available yet.
        </div>
      )}

      {slips.length > 0 && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Base Salary</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Overtime</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Bonuses</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Deductions</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Net Salary</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.map((slip) => {
                  const isExpanded = expanded.has(slip.id)
                  const hasDetails = slip.ot_entries.length > 0 || slip.bonus_entries.length > 0 || slip.deduction_entries.length > 0

                  return (
                    <React.Fragment key={slip.id}>
                      <tr className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          {hasDetails && (
                            <button onClick={() => toggleExpand(slip.id)} className="text-muted-foreground hover:text-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{formatMonthYear(slip.month, slip.year)}</td>
                        <td className="px-4 py-3 text-right text-foreground">{formatCurrency(slip.base_salary)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(slip.overtime_amount)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(slip.total_bonuses)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCurrency(slip.total_deductions)}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground text-base">{formatCurrency(slip.net_salary)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={slip.status === 'paid' ? 'success' : slip.status === 'locked' ? 'info' : 'default'}
                            className="capitalize text-xs"
                          >
                            {slip.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => handleDownload(slip)}
                            disabled={downloading === slip.id}
                          >
                            {downloading === slip.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            PDF
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded breakdown */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="bg-muted/50 px-8 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* OT entries */}
                              {slip.ot_entries.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-blue-700 mb-2">Overtime Entries</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left pb-1">Date</th>
                                        <th className="text-left pb-1">Type</th>
                                        <th className="text-right pb-1">Hours</th>
                                        <th className="text-right pb-1">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slip.ot_entries.map((e, i) => (
                                        <tr key={i} className="border-t border-border">
                                          <td className="py-1 pr-2 text-muted-foreground">{e.date}</td>
                                          <td className="py-1 pr-2 text-foreground capitalize">{e.type}</td>
                                          <td className="py-1 pr-2 text-right text-foreground">{e.hours}h</td>
                                          <td className="py-1 text-right text-blue-700 font-medium">{formatCurrency(e.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Bonus entries */}
                              {slip.bonus_entries.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-emerald-700 mb-2">Bonus Entries</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left pb-1">Date</th>
                                        <th className="text-left pb-1">Name</th>
                                        <th className="text-right pb-1">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slip.bonus_entries.map((e, i) => (
                                        <tr key={i} className="border-t border-border">
                                          <td className="py-1 pr-2 text-muted-foreground">{e.date}</td>
                                          <td className="py-1 pr-2 text-foreground">{e.name}</td>
                                          <td className="py-1 text-right text-emerald-700 font-medium">{formatCurrency(e.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Deduction entries */}
                              {slip.deduction_entries.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-red-700 mb-2">Deduction Entries</p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="text-left pb-1">Date</th>
                                        <th className="text-left pb-1">Name</th>
                                        <th className="text-right pb-1">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slip.deduction_entries.map((e, i) => (
                                        <tr key={i} className="border-t border-border">
                                          <td className="py-1 pr-2 text-muted-foreground">{e.date}</td>
                                          <td className="py-1 pr-2 text-foreground">{e.name}</td>
                                          <td className="py-1 text-right text-red-700 font-medium">{formatCurrency(e.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
