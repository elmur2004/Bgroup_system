'use client'

import React, { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/hr/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/hr/ui/dropdown-menu'
import { toast } from '@/components/hr/ui/toast'

interface ExportButtonProps {
  onExportExcel?: () => Promise<Blob | void>
  onExportPdf?: () => Promise<Blob | void>
  filename?: string
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ExportButton({
  onExportExcel,
  onExportPdf,
  filename = 'export',
  label = 'Export',
  variant = 'outline',
  size = 'md',
  disabled = false,
}: ExportButtonProps) {
  const [loadingType, setLoadingType] = useState<'excel' | 'pdf' | null>(null)

  async function handleExport(type: 'excel' | 'pdf') {
    const fn = type === 'excel' ? onExportExcel : onExportPdf
    if (!fn) return

    setLoadingType(type)
    try {
      const result = await fn()
      if (result instanceof Blob) {
        const ext = type === 'excel' ? 'xlsx' : 'pdf'
        downloadBlob(result, `${filename}-${new Date().toISOString().slice(0, 10)}.${ext}`)
        toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} exported successfully`)
      }
    } catch {
      toast.error('Export failed', 'Please try again')
    } finally {
      setLoadingType(null)
    }
  }

  // Single export type
  if (onExportExcel && !onExportPdf) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport('excel')}
        loading={loadingType === 'excel'}
        disabled={disabled}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  if (onExportPdf && !onExportExcel) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport('pdf')}
        loading={loadingType === 'pdf'}
        disabled={disabled}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  // Both types
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || !!loadingType}
          loading={!!loadingType}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportExcel && (
          <DropdownMenuItem onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
            Export as Excel
          </DropdownMenuItem>
        )}
        {onExportPdf && (
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileText className="h-4 w-4 mr-2 text-red-500" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
