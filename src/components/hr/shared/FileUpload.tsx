'use client'

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, ImageIcon } from 'lucide-react'
import { cn, getFileSize } from '@/lib/hr/utils'
import { Button } from '@/components/hr/ui/button'

interface FileUploadProps {
  accept?: Record<string, string[]>
  maxSize?: number // bytes
  multiple?: boolean
  files?: File[]
  onFilesChange: (files: File[]) => void
  label?: string
  hint?: string
  className?: string
  disabled?: boolean
}

export function FileUpload({
  accept = {
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  files = [],
  onFilesChange,
  label = 'Drop files here or click to upload',
  hint,
  className,
  disabled = false,
}: FileUploadProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (multiple) {
        onFilesChange([...files, ...accepted])
      } else {
        onFilesChange(accepted.slice(0, 1))
      }
    },
    [files, multiple, onFilesChange]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    disabled,
  })

  function removeFile(index: number) {
    const next = [...files]
    next.splice(index, 1)
    onFilesChange(next)
  }

  const acceptedExtensions = Object.values(accept).flat().join(', ')

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-brand-navy bg-brand-navy/5'
            : 'border-border bg-muted/50 hover:border-brand-navy hover:bg-brand-navy/5',
          disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-muted/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hint || `Accepted: ${acceptedExtensions} · Max ${getFileSize(maxSize)}`}
        </p>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-xs text-red-600">
              <span className="font-medium">{file.name}</span>:{' '}
              {errors.map((e) => e.message).join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{getFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
