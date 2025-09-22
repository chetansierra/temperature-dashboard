import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create browser client for client-side operations
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined
        
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift()
        }
        return undefined
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return
        
        let cookieString = `${name}=${value}`
        
        if (options?.expires) {
          cookieString += `; expires=${options.expires.toUTCString()}`
        }
        if (options?.maxAge) {
          cookieString += `; max-age=${options.maxAge}`
        }
        if (options?.domain) {
          cookieString += `; domain=${options.domain}`
        }
        if (options?.path) {
          cookieString += `; path=${options.path}`
        }
        if (options?.secure) {
          cookieString += `; secure`
        }
        if (options?.httpOnly) {
          // Note: httpOnly can't be set from client-side JavaScript
          console.warn('httpOnly cookie option ignored in browser context')
        }
        if (options?.sameSite) {
          cookieString += `; samesite=${options.sameSite}`
        }
        
        document.cookie = cookieString
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return
        
        this.set(name, '', { 
          ...options, 
          expires: new Date(0) 
        })
      }
    }
  })
}

// Export the client instance for compatibility
export const supabase = createClient()