// In-memory store for reset tokens: email -> { hashedToken, expiry }
// In production, use a database table or Redis
export const resetTokenStore = new Map<string, { hashedToken: string; expiry: number }>()
