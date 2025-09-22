import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

const HMAC_SECRET = process.env.HMAC_SECRET!
const REPLAY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export interface HMACValidationResult {
  valid: boolean
  error?: string
}

export function validateHMACRequest(request: NextRequest, body: string): HMACValidationResult {
  try {
    // Get required headers
    const timestamp = request.headers.get('x-timestamp')
    const deviceId = request.headers.get('x-device-id')
    const signature = request.headers.get('x-signature')
    const idempotencyKey = request.headers.get('idempotency-key')

    // Validate required headers
    if (!timestamp) {
      return { valid: false, error: 'Missing X-Timestamp header' }
    }

    if (!deviceId) {
      return { valid: false, error: 'Missing X-Device-Id header' }
    }

    if (!signature) {
      return { valid: false, error: 'Missing X-Signature header' }
    }

    if (!idempotencyKey) {
      return { valid: false, error: 'Missing Idempotency-Key header' }
    }

    // Validate timestamp format and replay window
    const requestTime = new Date(timestamp)
    if (isNaN(requestTime.getTime())) {
      return { valid: false, error: 'Invalid timestamp format' }
    }

    const now = new Date()
    const timeDiff = Math.abs(now.getTime() - requestTime.getTime())
    
    if (timeDiff > REPLAY_WINDOW_MS) {
      return { valid: false, error: 'Request timestamp outside allowed window (±5 minutes)' }
    }

    // Generate expected signature
    const expectedSignature = generateHMACSignature(body, timestamp, deviceId)

    // Compare signatures using timing-safe comparison
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid signature' }
    }

    return { valid: true }
  } catch (error) {
    console.error('HMAC validation error:', error)
    return { valid: false, error: 'HMAC validation failed' }
  }
}

export function generateHMACSignature(body: string, timestamp: string, deviceId?: string): string {
  // Create the message to sign: body + timestamp + deviceId (if provided)
  const message = body + timestamp + (deviceId || '')
  
  // Generate HMAC-SHA256 signature
  const hmac = createHmac('sha256', HMAC_SECRET)
  hmac.update(message, 'utf8')
  
  return hmac.digest('hex')
}

export function createHMACError(message: string) {
  return {
    error: {
      code: 'HMAC_VALIDATION_FAILED',
      message,
      requestId: crypto.randomUUID()
    }
  }
}

// Idempotency key tracking (in-memory for v1, use Redis in production)
const idempotencyStore = new Map<string, {
  response: any
  timestamp: number
}>()

// Clean up expired idempotency keys every hour
setInterval(() => {
  const now = Date.now()
  const expiry = 24 * 60 * 60 * 1000 // 24 hours
  
  for (const [key, value] of Array.from(idempotencyStore.entries())) {
    if (now - value.timestamp > expiry) {
      idempotencyStore.delete(key)
    }
  }
}, 60 * 60 * 1000)

export function checkIdempotency(key: string): any | null {
  const stored = idempotencyStore.get(key)
  if (stored) {
    return stored.response
  }
  return null
}

export function storeIdempotencyResponse(key: string, response: any): void {
  idempotencyStore.set(key, {
    response,
    timestamp: Date.now()
  })
}

export function createIdempotencyError() {
  return {
    error: {
      code: 'DUPLICATE_REQUEST',
      message: 'Request with this idempotency key has already been processed',
      requestId: crypto.randomUUID()
    }
  }
}

// Helper function to extract device ID from various sources
export function extractDeviceId(request: NextRequest): string | null {
  // Try X-Device-Id header first
  const headerDeviceId = request.headers.get('x-device-id')
  if (headerDeviceId) {
    return headerDeviceId
  }

  // Try to extract from request body if it's a JSON payload
  try {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('device_id')
    if (deviceId) {
      return deviceId
    }
  } catch {
    // Ignore URL parsing errors
  }

  return null
}

// Utility to mask sensitive data in logs
export function maskSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const masked = { ...data }
  
  // Mask common sensitive fields
  const sensitiveFields = ['signature', 'x-signature', 'authorization', 'token', 'secret', 'password']
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***'
    }
  }

  return masked
}
