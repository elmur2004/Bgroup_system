import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'uploads')

interface UploadResult {
  success: boolean
  filePath?: string
  fileName?: string
  error?: string
}

export async function saveUploadedFile(file: File, subDir: string = 'documents'): Promise<UploadResult> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` }
  }

  // Check extension
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { success: false, error: `File type '${ext}' not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }

  // Sanitize filename - use random UUID
  const safeFileName = `${crypto.randomUUID()}${ext}`
  const uploadPath = path.join(UPLOAD_DIR, subDir)

  // Ensure directory exists
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true })
  }

  const fullPath = path.join(uploadPath, safeFileName)

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(fullPath, buffer)

  return {
    success: true,
    filePath: `/uploads/${subDir}/${safeFileName}`,
    fileName: file.name,
  }
}

export function deleteUploadedFile(filePath: string): boolean {
  try {
    const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), filePath)
    // Prevent path traversal
    if (!fullPath.startsWith(UPLOAD_DIR)) return false
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      return true
    }
    return false
  } catch {
    return false
  }
}
