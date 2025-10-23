# Sensor Management Features

This document describes the new sensor management features that have been implemented.

## Features Overview

### 1. Enhanced Add Sensor Modal/Page
- **Multi-step wizard interface** with 3 steps:
  1. **Sensor Details**: Name, local ID, and model information
  2. **Site & Environment**: Site selection (auto-populates organization) and environment selection
  3. **Configuration**: Status, battery level, and active state

- **Sensor information fields**:
  - 📡 **Name**: Required sensor identifier
  - 🏷️ **Local ID**: Optional internal identifier (e.g., TEMP-001)
  - 🔧 **Model**: Optional model information (e.g., DHT22, DS18B20)
  - ⚡ **Status**: Active, Inactive, or Maintenance
  - 🔋 **Battery Level**: Percentage (0-100%)
  - ✅ **Active State**: Whether sensor can collect data

- **Smart navigation**: 
  - Validates each step before allowing progression
  - Auto-populates organization based on selected site
  - Shows helpful messages when dependencies aren't met
  - Automatically navigates to sensor detail page after creation

### 2. Sensor Detail Page with Live Data Visualization
- **Two-column layout**:
  - Left: Live data chart with time range selection
  - Right: Sensor information and quick actions

- **Live data chart features**:
  - Real-time data updates every 30 seconds
  - Multiple time range options (1h, 6h, 24h, 7d, 30d)
  - Responsive chart using Recharts library
  - Shows min/max values when available (for aggregated data)
  - Proper units display (°C for temperature, % for humidity)

- **Comprehensive sensor information**:
  - Sensor ID, model, local ID
  - Status and active state
  - Battery level with visual indicator
  - Last reading timestamp
  - Creation date
  - Location hierarchy (Organization → Site → Environment)

- **Quick actions panel**:
  - Edit sensor
  - View environment
  - View organization

### 3. Improved Sensors List Page
- **Clickable sensor names** that navigate to detail page
- **Enhanced action buttons**:
  - "View Details" - goes to sensor detail page
  - "Edit" - goes to edit page
  - "View Organization" - switches to organization view

- **Updated "Create Sensor" to "Add Sensor"** for consistency

## File Structure

```
src/
├── app/admin/sensors/
│   ├── page.tsx                    # Main sensors list (updated)
│   ├── [id]/
│   │   └── page.tsx               # New sensor detail page
│   ├── [id]/edit/
│   │   └── page.tsx               # Existing edit page
│   └── new/
│       └── page.tsx               # New standalone add sensor page
├── components/admin/
│   ├── AddSensorModal.tsx         # New enhanced modal component
│   └── CreateSensorForm.tsx       # Existing form (still available)
└── api/
    └── chart/query/route.ts       # Used for fetching sensor data
```

## Usage

### Adding a New Sensor

1. **From Sensors List**: Click "Add Sensor" button (uses current filters for preselection)
2. **From Environment Detail Page**: Click "Add Sensor" button (pre-fills site and environment)
3. **From Sites Page**: Click "Add Sensor" button on any site card (pre-fills site)
4. **From URL**: Navigate to `/admin/sensors/new`
5. **With Preselection**: Use URL params like `/admin/sensors/new?site=456&environment=789`

**New Workflow:**
- Step 1: Enter sensor name, local ID, and model
- Step 2: Select site (organization is auto-populated), then select environment  
- Step 3: Configure status, battery level, and active state

**Context-Aware Preselection:**
- **From Environment Detail Page**: Site and environment are pre-filled silently
- **From Sites Page**: Site is pre-filled silently
- **From Sensors Page with Filters**: Current filter values are pre-filled silently
- **Seamless Experience**: Preselection works behind the scenes without UI clutter

### Viewing Sensor Details

1. **From Sensors List**: Click on sensor name or "View Details"
2. **Direct URL**: Navigate to `/admin/sensors/{sensor-id}`

### Live Data Features

- **Auto-refresh**: Data refreshes every 30 seconds automatically
- **Manual refresh**: Click "Refresh Data" button
- **Time range selection**: Choose from dropdown (1h to 30d)
- **Responsive design**: Chart adapts to screen size

## Technical Implementation

### Chart Data Flow
1. Sensor detail page calls `/api/chart/query` with sensor ID and time range
2. API returns structured data with timestamps and values
3. Recharts renders the data with proper formatting and tooltips
4. Auto-refresh keeps data current

### Modal vs Page
- **Modal**: Used when adding sensor from existing pages
- **Standalone Page**: Used for direct navigation or bookmarking
- **Same Component**: Both use `AddSensorModal` component for consistency

### Database Schema Compatibility
The components are designed to work with your actual sensor table schema:
- `id` (uuid, primary key)
- `environment_id` (uuid, required)
- `site_id` (uuid, required) 
- `tenant_id` (uuid, required)
- `name` (text, required)
- `local_id` (text, optional)
- `model` (text, optional)
- `status` (text, default 'active')
- `battery_level` (integer, optional)
- `last_reading_at` (timestamp, optional)
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Dependencies
- **Recharts**: Already installed, used for data visualization
- **Chart.js Alternative**: If you prefer Chart.js, run `./install-chart-dependencies.sh`

## Future Enhancements

1. **Real-time WebSocket updates** for live data streaming
2. **Alert threshold visualization** on charts
3. **Data export functionality** (CSV, PDF)
4. **Sensor comparison views** (multiple sensors on one chart)
5. **Historical data analysis** with statistical insights
6. **Mobile-optimized charts** with touch interactions

## API Endpoints Used

- `GET /api/admin/sensors` - List all sensors
- `GET /api/admin/sensors/{id}` - Get sensor details
- `POST /api/admin/sensors` - Create new sensor
- `GET /api/chart/query` - Get sensor readings for charts
- `GET /api/admin/organizations` - List organizations
- `GET /api/admin/sites` - List sites by organization
- `GET /api/admin/environments` - List environments by site