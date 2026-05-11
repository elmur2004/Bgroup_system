import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { requireAuth } from '@/lib/hr/auth-utils'
import { isHROrAdmin } from '@/lib/hr/permissions'
import { saveUploadedFile } from '@/lib/hr/file-upload'
import { createAuditLog, getClientIp } from '@/lib/hr/audit'
import { uploadDocumentSchema } from '@/lib/hr/validations'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params
    const pk = id

    if (!isHROrAdmin(authUser)) {
      const ownEmp = await prisma.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      })
      if (!ownEmp || ownEmp.id !== pk) {
        return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
      }
    }

    const docs = await prisma.hrEmployeeDocument.findMany({
      where: { employeeId: pk },
      orderBy: { createdAt: 'desc' },
    })

    if (isHROrAdmin(authUser)) {
      await createAuditLog({
        userId: authUser.id,
        action: 'read',
        entityType: 'employee_documents',
        entityId: pk,
        ipAddress: getClientIp(request),
        details: `Listed documents for employee ${pk}`,
      })
    }

    const serialized = docs.map((d) => ({
      id: d.id,
      document_type: d.documentType,
      filename: d.filename,
      file_size: d.fileSize,
      uploaded_by_employee: d.uploadedByEmployee,
      upload_date: d.uploadDate.toISOString(),
      file_url: d.file,
    }))

    return NextResponse.json({ results: serialized, count: serialized.length })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request)
    const { id } = await params
    const pk = id

    let uploadedByEmployee = false
    if (!isHROrAdmin(authUser)) {
      const ownEmp = await prisma.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      })
      if (!ownEmp || ownEmp.id !== pk) {
        return NextResponse.json({ detail: 'Not found.' }, { status: 404 })
      }
      uploadedByEmployee = true
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ detail: 'No file provided.' }, { status: 400 })
    }

    const documentTypeRaw = formData.get('document_type')
    const parsed = uploadDocumentSchema.safeParse({
      document_type: documentTypeRaw !== null ? String(documentTypeRaw) : undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 })
    }
    const documentType = parsed.data.document_type || 'other'

    // Save file with validation
    const result = await saveUploadedFile(file, `employees/${id}`)
    if (!result.success) {
      return NextResponse.json({ detail: result.error }, { status: 400 })
    }

    const doc = await prisma.hrEmployeeDocument.create({
      data: {
        employeeId: pk,
        documentType,
        file: result.filePath!,
        filename: result.fileName!,
        fileSize: file.size,
        uploadedByEmployee,
        uploadedById: authUser.id,
        uploadDate: new Date(),
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      id: doc.id,
      document_type: doc.documentType,
      filename: doc.filename,
      file_size: doc.fileSize,
      uploaded_by_employee: doc.uploadedByEmployee,
      upload_date: doc.uploadDate.toISOString(),
      file_url: doc.file,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('Document upload error:', error)
    return NextResponse.json({ detail: 'Server error.' }, { status: 500 })
  }
}
