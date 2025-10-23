import { supabase } from '@/lib/supabase'

export interface ApiError {
  code: string
  message: string
  requestId?: string
}

export interface ApiResponse<T = any> {
  data?: T
  error?: ApiError
}

/**
 * Get a valid session with automatic token refresh
 * This ensures we always have a fresh, valid token for API calls
 */
export async function getValidSession() {
  try {
    // First, try to get the current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session fetch error:', error)
      return null
    }

    if (!session) {
      console.debug('No session found')
      return null
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0
    const timeUntilExpiry = expiresAt - now
    
    // If token expires within 5 minutes, refresh it
    if (timeUntilExpiry < 300) {
      console.debug('Token expires soon, refreshing...')
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // If refresh fails, the session is invalid
        return null
      }
      
      if (refreshData.session) {
        console.debug('Token refreshed successfully')
        return refreshData.session
      }
    }

    return session
  } catch (error) {
    console.error('getValidSession error:', error)
    return null
  }
}

/**
 * Enhanced fetch function with automatic authentication and error handling
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await getValidSession()
  
  if (!session) {
    throw new Error('Authentication required - please log in again')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Add Bearer token
  if (session.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    console.warn('Authentication failed, attempting token refresh...')
    
    // Try to refresh the token once more
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError || !refreshData.session) {
      // Refresh failed - user needs to log in again
      console.error('Token refresh failed, redirecting to login')
      
      // Clear the invalid session
      await supabase.auth.signOut()
      
      // Redirect to appropriate login page
      const currentPath = window.location.pathname
      if (currentPath.startsWith('/admin')) {
        window.location.href = '/admin-login'
      } else {
        window.location.href = '/login'
      }
      
      throw new Error('Session expired - redirecting to login')
    }

    // Retry the request with the new token
    headers.Authorization = `Bearer ${refreshData.session.access_token}`
    
    const retryResponse = await fetch(url, {
      ...options,
      headers,
    })

    return retryResponse
  }

  return response
}

/**
 * Wrapper for GET requests with automatic authentication
 */
export async function apiGet<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: {
          code: errorData.error?.code || 'REQUEST_FAILED',
          message: errorData.error?.message || `Request failed with status ${response.status}`,
          requestId: errorData.error?.requestId
        }
      }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API GET error:', error)
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    }
  }
}

/**
 * Wrapper for POST requests with automatic authentication
 */
export async function apiPost<T = any>(
  url: string, 
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: {
          code: errorData.error?.code || 'REQUEST_FAILED',
          message: errorData.error?.message || `Request failed with status ${response.status}`,
          requestId: errorData.error?.requestId
        }
      }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API POST error:', error)
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    }
  }
}

/**
 * Wrapper for PUT requests with automatic authentication
 */
export async function apiPut<T = any>(
  url: string, 
  body?: any
): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: {
          code: errorData.error?.code || 'REQUEST_FAILED',
          message: errorData.error?.message || `Request failed with status ${response.status}`,
          requestId: errorData.error?.requestId
        }
      }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API PUT error:', error)
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    }
  }
}

/**
 * Wrapper for DELETE requests with automatic authentication
 */
export async function apiDelete<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await authenticatedFetch(url, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        error: {
          code: errorData.error?.code || 'REQUEST_FAILED',
          message: errorData.error?.message || `Request failed with status ${response.status}`,
          requestId: errorData.error?.requestId
        }
      }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('API DELETE error:', error)
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed'
      }
    }
  }
}

/**
 * Enhanced fetcher for SWR with automatic authentication and error handling
 */
export const swrFetcher = async (url: string) => {
  const response = await apiGet(url)
  
  if (response.error) {
    const error = new Error(response.error.message)
    ;(error as any).code = response.error.code
    throw error
  }
  
  return response.data
}