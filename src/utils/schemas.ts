import { z } from 'zod'

// Common schemas
export const UUIDSchema = z.string().uuid()
export const EmailSchema = z.string().email()
export const TimestampSchema = z.string().datetime()

// User role schema
export const UserRoleSchema = z.enum(['master', 'site_manager', 'auditor', 'admin'])

// Environment type schema
export const EnvironmentTypeSchema = z.enum(['cold_storage', 'blast_freezer', 'chiller', 'other'])

// Sensor status schema
export const SensorStatusSchema = z.enum(['active', 'maintenance', 'decommissioned'])

// Alert schemas
export const AlertLevelSchema = z.enum(['warning', 'critical'])
export const AlertStatusSchema = z.enum(['open', 'acknowledged', 'resolved'])

// API Request/Response schemas

// Health endpoint
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: TimestampSchema,
  database: z.object({
    status: z.enum(['ok', 'error']),
    message: z.string().optional()
  }),
  auth: z.object({
    status: z.enum(['ok', 'error']),
    message: z.string().optional()
  })
})

// Ingestion endpoint
export const IngestReadingSchema = z.object({
  ts: TimestampSchema,
  sensor_id: UUIDSchema,
  value: z.number()
})

export const IngestRequestSchema = z.object({
  readings: z.array(IngestReadingSchema).min(1).max(1000)
})

export const IngestResponseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  errors: z.array(z.string()).optional()
})

// Overview endpoint
export const OverviewResponseSchema = z.object({
  tenant: z.object({
    id: UUIDSchema,
    name: z.string()
  }),
  stats: z.object({
    total_sites: z.number(),
    total_sensors: z.number(),
    active_alerts: z.number(),
    critical_alerts: z.number()
  }),
  recent_alerts: z.array(z.object({
    id: UUIDSchema,
    level: AlertLevelSchema,
    status: AlertStatusSchema,
    message: z.string(),
    site_name: z.string(),
    opened_at: TimestampSchema
  })),
  sensor_health: z.array(z.object({
    sensor_id: UUIDSchema,
    sensor_name: z.string(),
    site_name: z.string(),
    environment_name: z.string(),
    current_value: z.number().nullable(),
    status: SensorStatusSchema,
    last_reading: TimestampSchema.nullable()
  }))
})

// Sites endpoints
export const SiteSchema = z.object({
  id: UUIDSchema,
  tenant_id: UUIDSchema,
  site_name: z.string(),
  location: z.string().nullable(),
  timezone: z.string(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema
})

export const SitesResponseSchema = z.object({
  sites: z.array(SiteSchema.extend({
    environment_count: z.number(),
    sensor_count: z.number(),
    active_alerts: z.number(),
    health_status: z.enum(['healthy', 'warning', 'critical'])
  })),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    has_more: z.boolean()
  })
})

export const SiteDetailResponseSchema = z.object({
  site: SiteSchema,
  environments: z.array(z.object({
    id: UUIDSchema,
    name: z.string(),
    environment_type: EnvironmentTypeSchema,
    description: z.string().nullable(),
    sensor_count: z.number(),
    active_alerts: z.number(),
    avg_temperature: z.number().nullable(),
    created_at: TimestampSchema
  })),
  alerts: z.array(z.object({
    id: UUIDSchema,
    level: AlertLevelSchema,
    status: AlertStatusSchema,
    message: z.string(),
    environment_name: z.string(),
    sensor_name: z.string().nullable(),
    opened_at: TimestampSchema
  }))
})

// Environment endpoint
export const EnvironmentDetailResponseSchema = z.object({
  environment: z.object({
    id: UUIDSchema,
    site_id: UUIDSchema,
    tenant_id: UUIDSchema,
    environment_type: EnvironmentTypeSchema,
    name: z.string(),
    description: z.string().nullable(),
    created_at: TimestampSchema,
    updated_at: TimestampSchema
  }),
  site: z.object({
    id: UUIDSchema,
    site_name: z.string(),
    site_code: z.string()
  }),
  sensors: z.array(z.object({
    id: UUIDSchema,
    sensor_id_local: z.string().nullable(),
    property_measured: z.string(),
    location_details: z.string().nullable(),
    status: SensorStatusSchema,
    current_value: z.number().nullable(),
    last_reading: TimestampSchema.nullable(),
    installation_date: z.string().nullable()
  })),
  thresholds: z.array(z.object({
    id: UUIDSchema,
    min_c: z.number().nullable(),
    max_c: z.number().nullable(),
    level: z.enum(['org', 'site', 'environment', 'sensor'])
  }))
})

// Sensor endpoint
export const SensorDetailResponseSchema = z.object({
  sensor: z.object({
    id: UUIDSchema,
    tenant_id: UUIDSchema,
    site_id: UUIDSchema,
    environment_id: UUIDSchema,
    sensor_id_local: z.string().nullable(),
    property_measured: z.string(),
    installation_date: z.string().nullable(),
    location_details: z.string().nullable(),
    status: SensorStatusSchema,
    created_at: TimestampSchema,
    updated_at: TimestampSchema
  }),
  site: z.object({
    id: UUIDSchema,
    site_name: z.string(),
    site_code: z.string()
  }),
  environment: z.object({
    id: UUIDSchema,
    name: z.string(),
    environment_type: EnvironmentTypeSchema
  }),
  current_reading: z.object({
    value: z.number(),
    timestamp: TimestampSchema
  }).nullable(),
  recent_readings: z.array(z.object({
    ts: TimestampSchema,
    value: z.number()
  })),
  thresholds: z.array(z.object({
    id: UUIDSchema,
    min_c: z.number().nullable(),
    max_c: z.number().nullable(),
    level: z.enum(['org', 'site', 'environment', 'sensor'])
  }))
})

// Chart query endpoint
export const ChartQueryRequestSchema = z.object({
  sensor_ids: z.array(UUIDSchema).min(1).max(25),
  start_time: TimestampSchema,
  end_time: TimestampSchema,
  aggregation: z.enum(['raw', 'hourly', 'daily']).optional(),
  metrics: z.array(z.enum(['avg', 'min', 'max', 'p95'])).optional()
})

export const ChartQueryResponseSchema = z.object({
  data: z.array(z.object({
    sensor_id: UUIDSchema,
    sensor_name: z.string(),
    readings: z.array(z.object({
      timestamp: TimestampSchema,
      value: z.number(),
      avg_value: z.number().optional(),
      min_value: z.number().optional(),
      max_value: z.number().optional()
    }))
  })),
  metadata: z.object({
    total_points: z.number(),
    aggregation_used: z.enum(['raw', 'hourly', 'daily']),
    downsampled: z.boolean(),
    time_range: z.object({
      start: TimestampSchema,
      end: TimestampSchema
    })
  })
})

// Alerts endpoints
export const AlertsQuerySchema = z.object({
  status: AlertStatusSchema.optional(),
  level: AlertLevelSchema.optional(),
  site_id: UUIDSchema.optional(),
  environment_id: UUIDSchema.optional(),
  sensor_id: UUIDSchema.optional(),
  start_date: TimestampSchema.optional(),
  end_date: TimestampSchema.optional(),
  limit: z.number().min(1).max(200).optional(),
  cursor: z.string().optional()
})

export const AlertsResponseSchema = z.object({
  alerts: z.array(z.object({
    id: UUIDSchema,
    rule_id: UUIDSchema,
    level: AlertLevelSchema,
    status: AlertStatusSchema,
    message: z.string(),
    value: z.number().nullable(),
    threshold_min: z.number().nullable(),
    threshold_max: z.number().nullable(),
    site_name: z.string(),
    environment_name: z.string().nullable(),
    sensor_name: z.string().nullable(),
    opened_at: TimestampSchema,
    acknowledged_at: TimestampSchema.nullable(),
    resolved_at: TimestampSchema.nullable(),
    acknowledged_by: z.string().nullable(),
    resolved_by: z.string().nullable()
  })),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    cursor: z.string().nullable(),
    has_more: z.boolean()
  })
})

export const AlertActionResponseSchema = z.object({
  success: z.boolean(),
  alert: z.object({
    id: UUIDSchema,
    status: AlertStatusSchema,
    acknowledged_at: TimestampSchema.nullable(),
    resolved_at: TimestampSchema.nullable(),
    acknowledged_by: z.string().nullable(),
    resolved_by: z.string().nullable()
  })
})

// Settings endpoints
export const ThresholdRequestSchema = z.object({
  level: z.enum(['org', 'site', 'environment', 'sensor']),
  level_ref_id: UUIDSchema,
  min_c: z.number().nullable(),
  max_c: z.number().nullable()
}).refine(data => data.min_c !== null || data.max_c !== null, {
  message: "At least one of min_c or max_c must be provided"
})

export const ThresholdResponseSchema = z.object({
  success: z.boolean(),
  threshold: z.object({
    id: UUIDSchema,
    level: z.enum(['org', 'site', 'environment', 'sensor']),
    level_ref_id: UUIDSchema,
    min_c: z.number().nullable(),
    max_c: z.number().nullable(),
    created_at: TimestampSchema,
    updated_at: TimestampSchema
  })
})

// User invitation
export const UserInviteRequestSchema = z.object({
  email: EmailSchema,
  role: UserRoleSchema,
  site_id: UUIDSchema.optional(),
  access_expires_at: TimestampSchema.optional()
}).refine(data => {
  if (data.role === 'site_manager') {
    return data.site_id !== undefined
  }
  if (data.role === 'auditor') {
    return data.access_expires_at !== undefined
  }
  return true
}, {
  message: "Site managers must have site_id, auditors must have access_expires_at"
})

export const UserInviteResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: UUIDSchema,
    email: z.string(),
    role: UserRoleSchema,
    invited_at: TimestampSchema
  })
})

// Admin org search
export const AdminOrgSearchResponseSchema = z.object({
  organizations: z.array(z.object({
    id: UUIDSchema,
    name: z.string(),
    site_count: z.number(),
    user_count: z.number(),
    created_at: TimestampSchema
  }))
})

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: UUIDSchema.optional()
  })
})

// Rate limit headers schema
export const RateLimitHeadersSchema = z.object({
  'X-RateLimit-Limit': z.string(),
  'X-RateLimit-Remaining': z.string(),
  'X-RateLimit-Reset': z.string()
})
