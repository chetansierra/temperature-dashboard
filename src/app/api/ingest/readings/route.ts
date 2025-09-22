import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { IngestRequestSchema, IngestResponseSchema } from '@/utils/schemas'
import { validateHMACRequest, createHMACError, checkIdempotency, storeIdempotencyResponse, createIdempotencyError } from '@/utils/hmac'
import { rateLimiters, addRateLimitHeaders, createRateLimitError } from '@/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for ingestion
    const rateLimitResult = await rateLimiters.ingestion(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json(createRateLimitError(rateLimitResult.resetTime), { status: 429 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Get request body
    const body = await request.text()
    
    // Validate HMAC signature
    const hmacValidation = validateHMACRequest(request, body)
    if (!hmacValidation.valid) {
      const response = NextResponse.json(createHMACError(hmacValidation.error!), { status: 401 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Check idempotency
    const idempotencyKey = request.headers.get('idempotency-key')!
    const existingResponse = checkIdempotency(idempotencyKey)
    if (existingResponse) {
      const response = NextResponse.json(existingResponse)
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Parse and validate request body
    let requestData
    try {
      requestData = JSON.parse(body)
    } catch (error) {
      const errorResponse = {
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON',
          requestId: crypto.randomUUID()
        }
      }
      const response = NextResponse.json(errorResponse, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Validate against schema
    const validationResult = IngestRequestSchema.safeParse(requestData)
    if (!validationResult.success) {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request format',
          requestId: crypto.randomUUID(),
          details: validationResult.error.issues
        }
      }
      const response = NextResponse.json(errorResponse, { status: 400 })
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { readings } = validationResult.data
    const errors: string[] = []
    let processedCount = 0

    // Process readings in batches
    const batchSize = 100
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize)
      
      try {
        // Verify all sensors exist
        const sensorIds = Array.from(new Set(batch.map(r => r.sensor_id)))
        const { data: sensors, error: sensorError } = await supabaseAdmin
          .from('sensors')
          .select('id')
          .in('id', sensorIds)

        if (sensorError) {
          errors.push(`Sensor validation failed: ${sensorError.message}`)
          continue
        }

        const existingSensorIds = new Set(
          sensors?.map(s => s.id) || []
        )

        // Filter readings for existing sensors only
        const validReadings = batch.filter(reading => {
          if (!existingSensorIds.has(reading.sensor_id)) {
            errors.push(`Sensor ${reading.sensor_id} does not exist`)
            return false
          }
          return true
        })

        if (validReadings.length === 0) {
          continue
        }

        // Insert readings using service role (bypasses RLS)
        const { error: insertError } = await supabaseAdmin
          .from('readings')
          .insert(
            validReadings.map(reading => ({
              ts: reading.ts,
              sensor_id: reading.sensor_id,
              temperature: reading.value
            }))
          )

        if (insertError) {
          errors.push(`Batch insert failed: ${insertError.message}`)
        } else {
          processedCount += validReadings.length
        }

      } catch (error) {
        console.error('Batch processing error:', error)
        errors.push(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Prepare response
    const responseData = {
      success: processedCount > 0,
      processed: processedCount,
      ...(errors.length > 0 && { errors })
    }

    // Validate response against schema
    const validatedResponse = IngestResponseSchema.parse(responseData)

    // Store response for idempotency
    storeIdempotencyResponse(idempotencyKey, validatedResponse)

    // Log successful ingestion (mask sensitive data)
    console.log('Ingestion completed:', {
      deviceId: request.headers.get('x-device-id'),
      processed: processedCount,
      errors: errors.length,
      timestamp: new Date().toISOString()
    })

    const response = NextResponse.json(validatedResponse, { 
      status: processedCount > 0 ? 200 : 400 
    })
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Ingestion error:', error)
    
    const errorResponse = {
      error: {
        code: 'INGESTION_FAILED',
        message: 'Data ingestion failed',
        requestId: crypto.randomUUID()
      }
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Disable caching for ingestion endpoint
export const dynamic = 'force-dynamic'
