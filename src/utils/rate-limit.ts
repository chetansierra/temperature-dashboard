import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<{
    success: boolean
    limit: number
    remaining: number
    resetTime: number
  }> => {
    const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Initialize or get existing record
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      }
    }

    // Increment count
    store[key].count++

    const success = store[key].count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - store[key].count)

    return {
      success,
      limit: config.maxRequests,
      remaining,
      resetTime: store[key].resetTime
    }
  }
}

function getDefaultKey(request: NextRequest): string {
  // Use IP address as default key
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return `rate_limit:${ip}`
}

function getUserKey(request: NextRequest, userId: string): string {
  return `rate_limit:user:${userId}`
}

// Pre-configured rate limiters
export const rateLimiters = {
  // GET requests: 60 per minute per user
  get: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id') || 'anonymous'
      return getUserKey(request, userId)
    }
  }),

  // POST requests: 20 per minute per user
  post: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id') || 'anonymous'
      return getUserKey(request, userId)
    }
  }),

  // Chart queries: 10 per minute per user
  chartQuery: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (request) => {
      const userId = request.headers.get('x-user-id') || 'anonymous'
      return `rate_limit:chart:${userId}`
    }
  }),

  // Ingestion: 100 per minute per device
  ingestion: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (request) => {
      const deviceId = request.headers.get('x-device-id') || 'unknown'
      return `rate_limit:ingest:${deviceId}`
    }
  })
}

export function addRateLimitHeaders(response: NextResponse, result: {
  limit: number
  remaining: number
  resetTime: number
}): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
  
  return response
}

export function createRateLimitError(resetTime: number) {
  return {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      requestId: crypto.randomUUID(),
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    }
  }
}
