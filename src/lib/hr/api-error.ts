import { NextResponse } from 'next/server'
import crypto from 'crypto'

export function handleApiError(error: unknown, context: string = '') {
  if (error instanceof Response) return error

  const errorId = crypto.randomUUID().split('-')[0]

  // Prisma error mapping
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          { detail: 'A record with this value already exists.', field: prismaError.meta?.target?.[0] },
          { status: 409 }
        )
      case 'P2003':
        return NextResponse.json(
          { detail: 'Referenced record not found.' },
          { status: 400 }
        )
      case 'P2025':
        return NextResponse.json(
          { detail: 'Record not found.' },
          { status: 404 }
        )
    }
  }

  console.error(`[${errorId}] ${context}:`, error)
  return NextResponse.json(
    { detail: 'Server error.', reference: errorId },
    { status: 500 }
  )
}
