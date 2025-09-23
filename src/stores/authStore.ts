import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'master' | 'site_manager' | 'auditor' | 'admin'
  tenant_id: string | null
  site_access: string[] | null
  auditor_expires_at: string | null
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isInitialized: boolean
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // Get initial session from cookies/localStorage
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth initialization error:', error)
        set({ isLoading: false, isInitialized: true })
        return
      }

      if (session?.user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          set({ 
            user: session.user, 
            profile: null, 
            isLoading: false, 
            isInitialized: true 
          })
          return
        }

        // Check if auditor access has expired
        if (profile.role === 'auditor' && profile.auditor_expires_at) {
          const expiryDate = new Date(profile.auditor_expires_at)
          if (expiryDate < new Date()) {
            // Access expired, sign out
            await supabase.auth.signOut()
            set({ 
              user: null, 
              profile: null, 
              isLoading: false, 
              isInitialized: true 
            })
            return
          }
        }

        set({ 
          user: session.user, 
          profile, 
          isLoading: false, 
          isInitialized: true 
        })
      } else {
        set({ 
          user: null, 
          profile: null, 
          isLoading: false, 
          isInitialized: true 
        })
      }

      // Listen for auth changes and sync with cookies
      supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (!profileError && profile) {
            // Check auditor access expiry
            if (profile.role === 'auditor' && profile.auditor_expires_at) {
              const expiryDate = new Date(profile.auditor_expires_at)
              if (expiryDate < new Date()) {
                await supabase.auth.signOut()
                return
              }
            }

            set({ user: session.user, profile, isLoading: false })
          } else {
            set({ user: session.user, profile: null, isLoading: false })
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, isLoading: false })
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed - maintain current state but log it
          console.log('Token refreshed for user:', session.user?.id)
        }
      })

    } catch (error) {
      console.error('Auth store initialization error:', error)
      set({ isLoading: false, isInitialized: true })
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        set({ isLoading: false })
        return { error: error.message }
      }

      if (data.user && data.session) {
        // Profile will be fetched by the auth state change listener
        console.log('Sign in successful, session established')
        return {}
      }

      set({ isLoading: false })
      return { error: 'Sign in failed' }
    } catch (error) {
      set({ isLoading: false })
      return { error: 'An unexpected error occurred' }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      // State will be updated by the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error)
    }
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && profile) {
        // Check auditor access expiry
        if (profile.role === 'auditor' && profile.auditor_expires_at) {
          const expiryDate = new Date(profile.auditor_expires_at)
          if (expiryDate < new Date()) {
            await supabase.auth.signOut()
            return
          }
        }

        set({ profile })
      }
    } catch (error) {
      console.error('Profile refresh error:', error)
    }
  }
}))

// Helper hooks for common role checks
export const useIsAuthenticated = () => {
  const { user, profile } = useAuthStore()
  return !!(user && profile)
}

export const useHasRole = (allowedRoles: UserProfile['role'][]) => {
  const { profile } = useAuthStore()
  return profile ? allowedRoles.includes(profile.role) : false
}

export const useCanManageAlerts = (siteId?: string) => {
  const { profile } = useAuthStore()
  if (!profile) return false
  
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

export const useCanAccessSite = (siteId: string) => {
  const { profile } = useAuthStore()
  if (!profile) return false
  
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
