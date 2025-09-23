import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'
import { Database } from '@/lib/supabase'

export type UserProfile = Database['public']['Tables']['profiles']['Row']

export interface AuthContext {
  user: {
    id: string
    email: string
  }
  profile: UserProfile
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    // Use unified server client for cookie-based authentication
    const supabase = await createServerSupabaseClient()

    // First try cookie-based authentication
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    // If cookie auth fails, try Authorization header (Bearer token)
    if (authError || !user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        console.debug('Auth - trying Bearer token authentication')

        // Create a new client with the token
        const { createClient } = await import('@supabase/supabase-js')
        const tempSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: tokenData, error: tokenError } = await tempSupabase.auth.getUser(token)
        if (!tokenError && tokenData.user) {
          user = tokenData.user
          authError = null
          console.debug('Auth - Bearer token authentication successful')
        } else {
          console.debug('Auth - Bearer token authentication failed:', tokenError)
        }
      }
    }

    if (authError || !user) {
      return null
    }

    // Get the user profile with role and tenant information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    // Check if auditor access has expired
    if (profile.role === 'auditor' && profile.auditor_expires_at) {
      const expiryDate = new Date(profile.auditor_expires_at)
      if (expiryDate < new Date()) {
        return null // Access expired
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email!
      },
      profile
    }
  } catch (error) {
    console.error('Auth context error:', error)
    return null
  }
}

export function hasRole(profile: UserProfile, allowedRoles: UserProfile['role'][]): boolean {
  return allowedRoles.includes(profile.role)
}

export function canAccessSite(profile: UserProfile, siteId: string): boolean {
  // Admin can access any site
  if (profile.role === 'admin') {
    return true
  }
  
  // Site manager can only access their assigned sites
  if (profile.role === 'site_manager') {
    return profile.site_access?.includes(siteId) || false
  }
  
  // Master and auditor can access any site in their tenant (handled by RLS)
  return profile.role === 'master' || profile.role === 'auditor'
}

export function canManageAlerts(profile: UserProfile, siteId?: string): boolean {
  // Admin and auditor cannot manage alerts (read-only)
  if (profile.role === 'admin' || profile.role === 'auditor') {
    return false
  }
  
  // Master can manage alerts in their tenant
  if (profile.role === 'master') {
    return true
  }
  
  // Site manager can manage alerts in their assigned sites
  if (profile.role === 'site_manager' && siteId) {
    return profile.site_access?.includes(siteId) || false
  }
  
  return false
}

export function canManageUsers(profile: UserProfile): boolean {
  // Only masters can manage users in their tenant
  return profile.role === 'master'
}

export function canManageThresholds(profile: UserProfile, siteId?: string): boolean {
  // Admin and auditor cannot manage thresholds
  if (profile.role === 'admin' || profile.role === 'auditor') {
    return false
  }
  
  // Master can manage thresholds in their tenant
  if (profile.role === 'master') {
    return true
  }
  
  // Site manager can manage thresholds in their assigned sites
  if (profile.role === 'site_manager' && siteId) {
    return profile.site_access?.includes(siteId) || false
  }
  
  return false
}

export function isAdmin(profile: UserProfile): boolean {
  return profile.role === 'admin'
}

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (username.length <= 2) {
    return `${username[0]}*@${domain}`
  }
  return `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`
}

export function createAuthError(message: string, code: string = 'UNAUTHORIZED') {
  return {
    error: {
      code,
      message,
      requestId: crypto.randomUUID()
    }
  }
}
