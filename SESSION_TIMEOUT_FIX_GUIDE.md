# Session Timeout Fix Implementation Guide

## 🎯 Problem Solved
Fixed the issue where the website becomes unresponsive after 5-7 minutes of inactivity due to JWT token expiration and lack of automatic refresh.

## ✅ What's Been Implemented

### 1. Core Authentication Utilities (`src/utils/api.ts`)
- **`getValidSession()`**: Automatically checks and refreshes tokens before they expire
- **`authenticatedFetch()`**: Enhanced fetch with automatic auth handling and retry logic
- **`apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`**: Wrapper functions for all HTTP methods
- **`swrFetcher`**: SWR-compatible fetcher with automatic authentication

### 2. Enhanced Auth Store (`src/stores/authStore.ts`)
- Added session expiration checking during initialization
- Improved token refresh handling
- Better error handling for expired sessions

### 3. Centralized Fetchers (`src/utils/fetchers.ts`)
- Unified fetcher for SWR usage across the app
- Backward compatibility with existing code

### 4. Updated Pages & Components
**✅ Completed:**
- `src/app/environments/page.tsx`
- `src/app/sites/[siteId]/page.tsx`
- `src/app/sensors/page.tsx`
- `src/app/analytics/page.tsx`
- `src/app/alerts/page.tsx`
- `src/app/environments/[envId]/page.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/components/pages/OverviewContent.tsx`
- `src/components/admin/AddSensorModal.tsx`

## 🔧 How It Works

### Automatic Token Refresh
1. Before each API call, `getValidSession()` checks if the token expires within 5 minutes
2. If expiring soon, it automatically refreshes the token
3. If refresh fails, user is redirected to appropriate login page

### Error Handling
1. If API returns 401/403, attempts one token refresh
2. Retries the request with new token
3. If still fails, redirects to login and clears session

### Session Validation
1. Checks token expiration on app initialization
2. Handles expired sessions gracefully
3. Maintains user state during token refresh

## 📋 Remaining Manual Updates Needed

The following files still need manual updates to replace their API calls:

### Admin Pages
- `src/app/admin/users/page.tsx`
- `src/app/admin/sites/page.tsx`
- `src/app/admin/environments/page.tsx`
- `src/app/admin/environments/[id]/page.tsx`
- `src/app/admin/environments/[id]/edit/page.tsx`
- `src/app/admin/sensors/[id]/page.tsx`
- `src/app/admin/organizations/page.tsx`
- `src/app/admin/organizations/[id]/page.tsx`
- `src/app/admin/organizations/[id]/edit/page.tsx`
- `src/app/admin/organizations/[id]/users/page.tsx`
- `src/app/admin/organizations/[id]/users/new/page.tsx`
- `src/app/admin/users/[id]/edit/page.tsx`
- `src/app/admin/organizations/new/page.tsx`

### Components
- `src/components/admin/OrganizationSelector.tsx`
- `src/components/SitesList.tsx`

## 🛠️ How to Update Remaining Files

### For SWR Fetchers
Replace:
```typescript
const fetcher = async (url: string) => {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  // ... rest of fetcher code
}
```

With:
```typescript
import { fetcher } from '@/utils/fetchers'
```

### For Manual API Calls
Replace:
```typescript
// Get session and setup headers
const { supabase } = await import('@/lib/supabase')
const { data: { session } } = await supabase.auth.getSession()
const headers = { 'Content-Type': 'application/json' }
if (session?.access_token) {
  headers.Authorization = `Bearer ${session.access_token}`
}

// Make request
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers,
  body: JSON.stringify(data)
})

if (!response.ok) {
  const errorData = await response.json()
  throw new Error(errorData.error?.message || 'Request failed')
}

const result = await response.json()
```

With:
```typescript
import { apiPost } from '@/utils/api'

const response = await apiPost('/api/endpoint', data)

if (response.error) {
  throw new Error(response.error.message || 'Request failed')
}

const result = response.data
```

### API Method Mapping
- **GET requests**: Use `apiGet(url)`
- **POST requests**: Use `apiPost(url, body)`
- **PUT requests**: Use `apiPut(url, body)`
- **DELETE requests**: Use `apiDelete(url)`

## 🚀 Benefits

1. **No More Timeouts**: Automatic token refresh prevents session expiration
2. **Better UX**: Seamless authentication without user intervention
3. **Error Recovery**: Automatic retry with fresh tokens
4. **Consistent Auth**: Centralized authentication logic
5. **Graceful Degradation**: Proper redirects when auth fails completely

## 🧪 Testing

To test the fix:
1. Log in to the application
2. Wait 5-7 minutes without activity
3. Try clicking on any interactive element
4. The app should continue working without requiring a page refresh

## 📝 Notes

- The fix maintains backward compatibility
- Existing error handling patterns are preserved
- Session state is properly managed throughout the app
- Automatic redirects work for both admin and user areas