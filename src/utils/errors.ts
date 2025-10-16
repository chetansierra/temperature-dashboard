export interface StandardErrorResponse {
  error: {
    code: string
    message: string
    requestId: string
    details?: Record<string, any>
  }
}

export const ErrorCodes = {
  // Authentication errors
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
  
  // Organization access errors
  ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
  NO_ORGANIZATION_MEMBERSHIP: 'NO_ORGANIZATION_MEMBERSHIP',
  
  // Resource errors
  SITE_NOT_FOUND: 'SITE_NOT_FOUND',
  ENVIRONMENT_NOT_FOUND: 'ENVIRONMENT_NOT_FOUND',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FETCH_FAILED: 'FETCH_FAILED'
} as const

export const ErrorMessages = {
  [ErrorCodes.AUTHENTICATION_REQUIRED]: 'Authentication is required to access this resource',
  [ErrorCodes.AUTHORIZATION_DENIED]: 'You do not have permission to access this resource',
  [ErrorCodes.ORGANIZATION_ACCESS_DENIED]: 'You can only access resources from your organization',
  [ErrorCodes.NO_ORGANIZATION_MEMBERSHIP]: 'Your account is not associated with any organization',
  [ErrorCodes.SITE_NOT_FOUND]: 'The requested site was not found or you do not have access to it',
  [ErrorCodes.ENVIRONMENT_NOT_FOUND]: 'The requested environment was not found or you do not have access to it',
  [ErrorCodes.VALIDATION_ERROR]: 'The provided data is invalid',
  [ErrorCodes.INVALID_REQUEST]: 'The request format is invalid',
  [ErrorCodes.INTERNAL_ERROR]: 'An internal server error occurred',
  [ErrorCodes.DATABASE_ERROR]: 'A database error occurred',
  [ErrorCodes.FETCH_FAILED]: 'Failed to fetch the requested data'
} as const

export function createStandardError(
  code: keyof typeof ErrorCodes,
  customMessage?: string,
  details?: Record<string, any>
): StandardErrorResponse {
  return {
    error: {
      code: ErrorCodes[code],
      message: customMessage || ErrorMessages[ErrorCodes[code]],
      requestId: crypto.randomUUID(),
      details
    }
  }
}

export function createOrganizationAccessError(
  userTenantId: string | null,
  resourceTenantId: string
): StandardErrorResponse {
  return createStandardError(
    'ORGANIZATION_ACCESS_DENIED',
    'You can only access sites from your organization',
    {
      userOrganization: userTenantId,
      resourceOrganization: resourceTenantId
    }
  )
}

export function createValidationError(
  message: string,
  validationDetails?: Record<string, any>
): StandardErrorResponse {
  return createStandardError(
    'VALIDATION_ERROR',
    message,
    validationDetails
  )
}

export function createNotFoundError(
  resourceType: string,
  resourceId?: string
): StandardErrorResponse {
  const message = resourceId 
    ? `${resourceType} with ID ${resourceId} was not found or you do not have access to it`
    : `The requested ${resourceType} was not found or you do not have access to it`
    
  return createStandardError(
    resourceType.toUpperCase().includes('SITE') ? 'SITE_NOT_FOUND' : 'ENVIRONMENT_NOT_FOUND',
    message,
    { resourceType, resourceId }
  )
}

export function getUserFriendlyErrorMessage(error: StandardErrorResponse): string {
  const { code, message } = error.error
  
  switch (code) {
    case ErrorCodes.NO_ORGANIZATION_MEMBERSHIP:
      return 'Your account needs to be associated with an organization. Please contact your administrator.'
    
    case ErrorCodes.ORGANIZATION_ACCESS_DENIED:
      return 'You can only access resources from your organization.'
    
    case ErrorCodes.SITE_NOT_FOUND:
      return 'The site you are looking for does not exist or you do not have access to it.'
    
    case ErrorCodes.ENVIRONMENT_NOT_FOUND:
      return 'The environment you are looking for does not exist or you do not have access to it.'
    
    case ErrorCodes.AUTHENTICATION_REQUIRED:
      return 'Please log in to access this resource.'
    
    case ErrorCodes.AUTHORIZATION_DENIED:
      return 'You do not have permission to perform this action.'
    
    default:
      return message || 'An unexpected error occurred. Please try again.'
  }
}