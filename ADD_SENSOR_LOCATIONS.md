# Add Sensor Button Locations & Preselection

This document outlines where "Add Sensor" buttons are located and what values they preselect.

## Button Locations

### 1. Environment Detail Page (`/admin/environments/[id]`)
**Buttons:**
- "Add Sensor" (in sensor management section)
- "Add First Sensor" (when no sensors exist)

**Preselection:**
- ✅ Site ID (from environment's site)
- ✅ Environment ID (current environment)
- ✅ Organization ID (auto-populated from site)

**URL Pattern:** `/admin/sensors/new?site={site_id}&environment={environment_id}`

### 2. Sites Page (`/admin/sites`)
**Button:**
- "Add Sensor" (on each site card)

**Preselection:**
- ✅ Site ID (selected site)
- ✅ Organization ID (auto-populated from site)

**URL Pattern:** `/admin/sensors/new?site={site_id}`

### 3. Sensors Page (`/admin/sensors`)
**Button:**
- "Add Sensor" (main page button)

**Preselection:**
- ✅ Site ID (if site filter is active)
- ✅ Environment ID (if environment filter is active)
- ✅ Organization ID (auto-populated from site)

**Modal Usage:** Uses `AddSensorModal` component with current filter values

### 4. Direct URL Access
**URL:** `/admin/sensors/new`

**Preselection:**
- Supports URL parameters: `?site={id}&environment={id}`
- No preselection if no parameters provided

## Preselection Logic

### Auto-Population Flow
1. **Environment Preselected** → Fetches environment details → Auto-fills site → Auto-fills organization
2. **Site Preselected** → Auto-fills organization from site's tenant
3. **Organization** → Always auto-populated, never manually selected

### Silent Preselection
- Values are pre-filled automatically without visual indicators
- Works seamlessly in the background for better user experience
- No UI clutter or unnecessary confirmation messages

## Implementation Details

### AddSensorModal Props
```typescript
interface AddSensorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  preselectedSite?: string
  preselectedEnvironment?: string
}
```

### Key Functions
- `fetchEnvironmentDetails()` - Auto-populates site when environment is preselected
- `fetchAllSites()` - Loads all sites with organization data
- Auto-population logic in `useEffect` hooks

### URL Parameter Mapping
- `site` → `preselectedSite`
- `environment` → `preselectedEnvironment`
- `organization` → Not used (auto-populated)

## Benefits

1. **Context Awareness** - Users don't need to re-select known values
2. **Faster Workflow** - Reduces clicks and potential errors
3. **Data Integrity** - Ensures consistent organization/site/environment relationships
4. **Clean UX** - Silent preselection without UI clutter
5. **Flexible Access** - Multiple entry points with appropriate context
6. **Bearer Token Auth** - Proper authentication for all API calls