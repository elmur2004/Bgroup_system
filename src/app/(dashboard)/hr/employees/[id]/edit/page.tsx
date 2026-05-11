'use client'

import React, { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2, Camera, User } from 'lucide-react'
import { PageHeader } from '@/components/hr/shared/PageHeader'
import { Card } from '@/components/hr/ui/card'
import { Button } from '@/components/hr/ui/button'
import { Input } from '@/components/hr/ui/input'
import { Label } from '@/components/hr/ui/label'
import { Textarea } from '@/components/hr/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/hr/ui/select'
import { toast } from '@/components/hr/ui/toast'
import api, { employeesApi, companiesApi, departmentsApi } from '@/lib/hr/api'
import type { Company, Department, Employee } from '@/lib/hr/types'

// ─── Schema ──────────────────────────────────────────────────────────────────

const editSchema = z.object({
  // Personal
  full_name_en: z.string().min(2, 'Required'),
  full_name_ar: z.string().optional(),
  national_id: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  personal_email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),

  // Employment
  company: z.coerce.number().min(1, 'Required'),
  department: z.coerce.number().optional(),
  position_en: z.string().min(2, 'Required'),
  position_ar: z.string().optional(),
  level: z.enum(['junior', 'mid', 'senior', 'lead', 'manager']),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  work_model: z.enum(['on_site', 'remote', 'hybrid']),
  status: z.enum(['active', 'probation', 'on_leave', 'suspended', 'terminated']),
  direct_manager: z.coerce.number().optional().nullable(),
  shift: z.coerce.number().optional().nullable(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  probation_end: z.string().optional(),

  // Salary
  base_salary: z.coerce.number().min(0),
  currency: z.enum(['EGP', 'QAR', 'AED']),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  iban: z.string().optional(),
})

type EditFormData = z.infer<typeof editSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FormSection({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-6">
      <div className="mb-5 pb-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{children}</div>
    </Card>
  )
}

function FieldWrapper({ label, error, children, className }: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const employeeId = String(params.id)

  // Load employee and companies first
  const { data: empData, isLoading: empLoading } = useQuery<{ data: Employee }>({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesApi.get(employeeId),
    enabled: !!employeeId,
  })
  const employee = empData?.data

  const { data: companiesData } = useQuery<{ data: { results: Company[] } }>({
    queryKey: ['companies'],
    queryFn: () => companiesApi.list(),
  })

  // Build form values from employee data — fallback to valid enum defaults for blank-imported employees
  const emp = employee as Record<string, unknown> | undefined
  const formValues = emp ? {
    full_name_en: (emp.full_name_en as string) ?? '',
    full_name_ar: (emp.full_name_ar as string) ?? '',
    national_id: (emp.national_id as string) ?? '',
    date_of_birth: (emp.date_of_birth as string) ?? '',
    gender: (emp.gender as 'male' | 'female') || undefined,
    personal_email: (emp.personal_email as string) ?? '',
    phone: (emp.phone as string) ?? '',
    address: (emp.address as string) ?? '',
    emergency_contact_name: (emp.emergency_contact_name as string) ?? '',
    emergency_contact_phone: (emp.emergency_contact_phone as string) ?? '',
    company: (emp.company as number),
    department: (emp.department as number) || undefined,
    position_en: (emp.position_en as string) ?? '',
    position_ar: (emp.position_ar as string) ?? '',
    level: ((emp.level as string) || 'junior') as 'junior',
    employment_type: ((emp.employment_type as string) || 'full_time') as 'full_time',
    work_model: ((emp.work_model as string) || 'on_site') as 'on_site',
    status: ((emp.status as string) || 'active') as 'active',
    direct_manager: (emp.direct_manager as number) || null,
    shift: (emp.shift as number) || null,
    contract_start: (emp.contract_start as string) ?? '',
    contract_end: (emp.contract_end as string) ?? '',
    probation_end: (emp.probation_end as string) ?? '',
    base_salary: (emp.base_salary as number) ?? 0,
    currency: (((emp.currency as string) || 'EGP')) as 'EGP',
    bank_name: (emp.bank_name as string) ?? '',
    bank_account: (emp.bank_account as string) ?? '',
    iban: (emp.iban as string) ?? '',
  } : undefined

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
    values: formValues,
  })

  const selectedCompany = watch('company')

  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const { data: deptsData } = useQuery<{ data: { results: Department[] } }>({
    queryKey: ['departments', selectedCompany],
    queryFn: () => departmentsApi.list({ company: selectedCompany }),
    enabled: !!selectedCompany,
  })

  const { data: shiftsData } = useQuery<{ data: { results: Array<{ id: number; name: string }> } }>({
    queryKey: ['shifts'],
    queryFn: () => api.get('/attendance/shifts/'),
  })

  const { data: managersData } = useQuery<{ data: { results: Array<{ id: string; full_name_en: string; employee_id: string }> } }>({
    queryKey: ['employees-list'],
    queryFn: () => api.get('/employees/', { params: { page_size: 200 } }),
  })

  const companies = companiesData?.data?.results ?? []
  const departments = deptsData?.data?.results ?? []
  const shifts = shiftsData?.data?.results ?? []
  const managers = managersData?.data?.results ?? []

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) => employeesApi.update(employeeId, data),
    onSuccess: async () => {
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await api.post(`/employees/${employeeId}/upload-photo/`, fd).catch(() => {})
      }
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
      toast.success('Employee updated')
      router.push(`/hr/employees/${employeeId}`)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? 'Failed to save changes.')
    },
  })

  function onSubmit(data: EditFormData) {
    // Clean up empty optional FK fields
    const payload = {
      ...data,
      direct_manager: data.direct_manager || null,
      shift: data.shift || null,
      department: data.department || null,
      contract_end: data.contract_end || null,
      probation_end: data.probation_end || null,
      date_of_birth: data.date_of_birth || null,
    }
    updateMutation.mutate(payload as EditFormData)
  }

  if (empLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading employee...
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg font-medium">Employee not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/hr/employees')}>
          Back to Employees
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={`Edit — ${employee.full_name_en}`}
        description={`${employee.employee_id} · ${employee.position_en}`}
        breadcrumbs={[
          { label: 'Employees', href: '/hr/employees' },
          { label: employee.full_name_en, href: `/employees/${employeeId}` },
          { label: 'Edit' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push(`/hr/employees/${employeeId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo Upload */}
        <Card className="p-6">
          <div className="mb-5 pb-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Profile Photo</h2>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative h-24 w-24 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-brand-navy transition-colors flex items-center justify-center shrink-0"
            >
              {photoPreview || employee.photo ? (
                <img
                  src={photoPreview ?? (employee.photo as string)}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">
                {photoPreview ? 'New photo selected' : employee.photo ? 'Current photo' : 'No photo uploaded'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Click the circle to change. JPG or PNG, max 5 MB.</p>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-2 text-xs text-brand-navy font-medium hover:underline flex items-center gap-1"
              >
                <Camera className="h-3.5 w-3.5" /> Change Photo
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </Card>

        {/* Section 1: Personal */}
        <FormSection title="Personal Information">
          <FieldWrapper label="Full Name (English) *" error={errors.full_name_en?.message}>
            <Input {...register('full_name_en')} />
          </FieldWrapper>

          <FieldWrapper label="Full Name (Arabic)">
            <Input {...register('full_name_ar')} dir="rtl" />
          </FieldWrapper>

          <FieldWrapper label="National ID">
            <Input {...register('national_id')} />
          </FieldWrapper>

          <FieldWrapper label="Date of Birth">
            <Input type="date" {...register('date_of_birth')} />
          </FieldWrapper>

          <FieldWrapper label="Gender">
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Phone" error={errors.phone?.message}>
            <Input {...register('phone')} />
          </FieldWrapper>

          <FieldWrapper label="Personal Email">
            <Input type="email" {...register('personal_email')} />
          </FieldWrapper>

          <FieldWrapper label="Address" className="sm:col-span-2">
            <Textarea {...register('address')} rows={2} />
          </FieldWrapper>

          <FieldWrapper label="Emergency Contact Name">
            <Input {...register('emergency_contact_name')} />
          </FieldWrapper>

          <FieldWrapper label="Emergency Contact Phone">
            <Input {...register('emergency_contact_phone')} />
          </FieldWrapper>
        </FormSection>

        {/* Section 2: Employment */}
        <FormSection title="Employment Details">
          <FieldWrapper label="Company *" error={errors.company?.message}>
            <Controller
              control={control}
              name="company"
              render={({ field }) => (
                <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Department">
            <Controller
              control={control}
              name="department"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  disabled={!selectedCompany}
                >
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Position (EN) *" error={errors.position_en?.message}>
            <Input {...register('position_en')} />
          </FieldWrapper>

          <FieldWrapper label="Position (AR)">
            <Input {...register('position_ar')} dir="rtl" />
          </FieldWrapper>

          <FieldWrapper label="Level *" error={errors.level?.message}>
            <Controller
              control={control}
              name="level"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['junior', 'mid', 'senior', 'lead', 'manager'].map((l) => (
                      <SelectItem key={l} value={l} className="capitalize">
                        {l.charAt(0).toUpperCase() + l.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Employment Type *" error={errors.employment_type?.message}>
            <Controller
              control={control}
              name="employment_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Work Model *" error={errors.work_model?.message}>
            <Controller
              control={control}
              name="work_model"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_site">On Site</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Status *" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Direct Manager">
            <Controller
              control={control}
              name="direct_manager"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {managers
                      .filter((m) => m.id !== employeeId)
                      .map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.employee_id} — {m.full_name_en}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Shift">
            <Controller
              control={control}
              name="shift"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                >
                  <SelectTrigger><SelectValue placeholder="No shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Contract Start">
            <Input type="date" {...register('contract_start')} />
          </FieldWrapper>

          <FieldWrapper label="Contract End">
            <Input type="date" {...register('contract_end')} />
          </FieldWrapper>

          <FieldWrapper label="Probation End">
            <Input type="date" {...register('probation_end')} />
          </FieldWrapper>
        </FormSection>

        {/* Section 3: Salary & Banking */}
        <FormSection title="Salary & Banking">
          <FieldWrapper label="Base Salary *" error={errors.base_salary?.message}>
            <Input type="number" min={0} step={100} {...register('base_salary')} />
          </FieldWrapper>

          <FieldWrapper label="Currency *" error={errors.currency?.message}>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">EGP — Egyptian Pound</SelectItem>
                    <SelectItem value="QAR">QAR — Qatari Riyal</SelectItem>
                    <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FieldWrapper>

          <FieldWrapper label="Bank Name">
            <Input {...register('bank_name')} />
          </FieldWrapper>

          <FieldWrapper label="Account Number">
            <Input {...register('bank_account')} />
          </FieldWrapper>

          <FieldWrapper label="IBAN">
            <Input {...register('iban')} className="font-mono" />
          </FieldWrapper>
        </FormSection>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 py-2">
          <Button
            type="submit"
            loading={isSubmitting || updateMutation.isPending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/hr/employees/${employeeId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
