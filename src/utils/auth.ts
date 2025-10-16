import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "master_user" | "user";
  tenant_id: string | null;
  site_access: string[] | null;
  auditor_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
  };
  profile: UserProfile;
}

export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  console.log("Auth - getAuthContext called");

  try {
    // First, check if middleware has set user headers
    const userIdHeader = request.headers.get('x-user-id')
    const userEmailHeader = request.headers.get('x-user-email')
    
    if (userIdHeader && userEmailHeader) {
      console.debug("Auth - Found user from middleware headers")
      
      // Get user profile using service role
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseServiceKey) {
        console.error("Auth - SUPABASE_SERVICE_ROLE_KEY not configured")
        return null
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userIdHeader)
        .single()

      if (!profileError && profile) {
        console.debug("Auth - Profile fetch successful via middleware:", profile.email, profile.role)
        return {
          user: {
            id: userIdHeader,
            email: userEmailHeader,
          },
          profile,
        }
      } else {
        console.debug("Auth - Profile fetch failed via middleware:", profileError?.message)
      }
    }

    // Fallback to Bearer token authentication
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      console.debug("Auth - Trying Bearer token authentication")

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
          })

          const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token)
          if (!tokenError && tokenData.user) {
            console.debug("Auth - Bearer token authentication successful")
            
            const { data: profile, error: profileError } = await supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", tokenData.user.id)
              .single()

            if (!profileError && profile) {
              console.debug("Auth - Profile fetch successful via Bearer token:", profile.email, profile.role)
              return {
                user: {
                  id: tokenData.user.id,
                  email: tokenData.user.email!,
                },
                profile,
              }
            }
          }
        } catch (bearerError) {
          console.debug("Auth - Bearer token authentication failed:", bearerError)
        }
      }
    }

    // Fallback to cookie-based authentication (legacy)
    const cookieHeader = request.headers.get('cookie') || ''
    console.debug("Auth - Trying cookie-based authentication as fallback")
    
    if (!cookieHeader) {
      console.debug("Auth - No cookie header found")
      return null
    }
    
    // Parse cookies into a map
    const cookieMap = new Map<string, string>()
    cookieHeader.split('; ').forEach(cookie => {
      const [name, ...rest] = cookie.split('=')
      if (name && rest.length > 0) {
        cookieMap.set(name, rest.join('='))
      }
    })
    
    console.debug("Auth - Total cookies found:", cookieMap.size)
    const supabaseCookies = Array.from(cookieMap.keys()).filter(name => name.startsWith('sb-'))
    console.debug("Auth - Supabase cookies:", supabaseCookies)

    if (supabaseCookies.length === 0) {
      console.debug("Auth - No Supabase cookies found")
      return null
    }

    // Use the server-side Supabase client with proper cookie handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const { createServerClient } = await import('@supabase/ssr')
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieMap.get(name)
        },
        set(name: string, value: string, options: any) {
          // Cannot set cookies in API routes
        },
        remove(name: string, options: any) {
          // Cannot remove cookies in API routes
        },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.debug("Auth - Cookie-based authentication failed:", userError?.message)
      return null
    }

    console.debug("Auth - User found via cookies:", user.email)

    // Get user profile using service role
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      console.error("Auth - SUPABASE_SERVICE_ROLE_KEY not configured")
      return null
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.debug("Auth - Profile fetch error:", profileError.message)
      return null
    }

    if (!profile) {
      console.debug("Auth - No profile found for user")
      return null
    }

    console.debug("Auth - Authentication successful via cookies:", profile.email, profile.role)

    return {
      user: {
        id: user.id,
        email: user.email!,
      },
      profile,
    }

  } catch (error) {
    console.error("Auth context error:", error);
    
    // Fallback: Try Bearer token authentication
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      console.debug("Auth - Trying Bearer token authentication as fallback")

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
          })

          const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getUser(token)
          if (!tokenError && tokenData.user) {
            console.debug("Auth - Bearer token authentication successful (fallback)")
            
            const { data: profile, error: profileError } = await supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", tokenData.user.id)
              .single()

            if (!profileError && profile) {
              return {
                user: {
                  id: tokenData.user.id,
                  email: tokenData.user.email!,
                },
                profile,
              }
            }
          }
        } catch (bearerError) {
          console.debug("Auth - Bearer token authentication failed:", bearerError)
        }
      }
    }
    
    return null;
  }
}

export function hasRole(
  profile: UserProfile,
  allowedRoles: UserProfile["role"][]
): boolean {
  return allowedRoles.includes(profile.role);
}

export function canAccessSite(profile: UserProfile, siteId?: string): boolean {
  // Admin can access any site
  if (profile.role === "admin") {
    return true;
  }

  // Master users and regular users can access sites in their organization
  if (profile.role === "master_user" || profile.role === "user") {
    // Access will be validated at the API level using tenant_id matching
    return profile.tenant_id !== null;
  }

  return false;
}

export function canManageAlerts(
  profile: UserProfile,
  siteId?: string
): boolean {
  // Admin has read-only access (no management)
  if (profile.role === "admin") {
    return false;
  }

  // Master user can manage alerts in their tenant
  if (profile.role === "master_user") {
    return true;
  }

  // Regular users have read-only access
  return false;
}

export function canManageUsers(profile: UserProfile): boolean {
  // Only admins can create/delete users
  // Master users can only assign site access
  return profile.role === "admin";
}

export function canManageSiteAccess(profile: UserProfile): boolean {
  // Master users can assign site access to regular users
  return profile.role === "master_user";
}

export function canManageOrganizations(profile: UserProfile): boolean {
  // Only admins can manage organizations
  return profile.role === "admin";
}

export function canManageThresholds(
  profile: UserProfile,
  siteId?: string
): boolean {
  // Admin has read-only access
  if (profile.role === "admin") {
    return false;
  }

  // Master user can manage thresholds in their tenant
  if (profile.role === "master_user") {
    return true;
  }

  // Regular users have read-only access
  return false;
}

export function isAdmin(profile: UserProfile): boolean {
  return profile.role === "admin";
}

export function isMasterUser(profile: UserProfile): boolean {
  return profile.role === "master_user";
}

export function isRegularUser(profile: UserProfile): boolean {
  return profile.role === "user";
}

export function getRedirectPath(profile: UserProfile): string {
  // Admin goes to admin portal
  if (profile.role === "admin") {
    return "/admin/dashboard";
  }

  // Master user and regular users go to main dashboard
  return "/overview";
}

export function maskEmail(email: string): string {
  const [username, domain] = email.split("@");
  if (username.length <= 2) {
    return `${username[0]}*@${domain}`;
  }
  return `${username[0]}${"*".repeat(username.length - 2)}${
    username[username.length - 1]
  }@${domain}`;
}

export function getOrganizationSiteFilter(profile: UserProfile) {
  if (profile.role === "admin") {
    return null; // No filter - can see all sites
  }
  
  if (profile.tenant_id) {
    return { tenant_id: profile.tenant_id };
  }
  
  return { tenant_id: "no-access" }; // Ensures no sites are returned
}

export function validateOrganizationAccess(
  userTenantId: string | null,
  resourceTenantId: string,
  userRole: string
): boolean {
  // Admin can access any organization
  if (userRole === "admin") {
    return true;
  }
  
  // Users must belong to the same organization
  return userTenantId === resourceTenantId;
}

export function createAuthError(
  message: string,
  code: string = "UNAUTHORIZED"
) {
  return {
    error: {
      code,
      message,
      requestId: crypto.randomUUID(),
    },
  };
}
