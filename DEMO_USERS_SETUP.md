# Demo Users Setup Guide

## Overview
The Temperature Dashboard requires demo users to be created in Supabase Auth before the application can be fully tested. This guide explains how to set up the demo users.

## Required Demo Users

Create these users in your Supabase Auth dashboard:

### 1. Master User (Full Access)
- **Email**: `master@acme.com`
- **Password**: `password123`
- **Role**: Master (full access to Acme Foods Ltd. organization)

### 2. Site Manager (Limited Access)
- **Email**: `manager.mumbai@acme.com`
- **Password**: `password123`
- **Role**: Site Manager (access only to Mumbai Warehouse)

### 3. Auditor (Read-Only, Time-Bound)
- **Email**: `auditor@temp-audit.com`
- **Password**: `password123`
- **Role**: Auditor (read-only access, expires in 30 days)

### 4. Platform Admin (Global Access)
- **Email**: `admin@dashboard.com`
- **Password**: `password123`
- **Role**: Admin (global platform access)

## Setup Steps

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**

### Step 2: Create Users
For each user above:
1. Click **"Add user"**
2. Enter the email address
3. Set a password (use `password123` for all demo users)
4. Check **"Auto confirm user"** (so they can sign in immediately)
5. Click **"Create user"**

### Step 3: Verify Users
After creating all users, you should see them in the Users table with:
- Confirmed status: ✅
- User ID: (copy these IDs for the next step)

### Step 4: Update Seed Data
In `supabase/seed.sql`, update the profile IDs to match the actual user IDs created in Supabase Auth:

```sql
-- Replace these UUIDs with the actual user IDs from Supabase Auth
INSERT INTO profiles (id, tenant_id, role, email, full_name, site_access, auditor_expires_at) VALUES
    ('[ACTUAL_MASTER_USER_ID]', '550e8400-e29b-41d4-a716-446655440001', 'master', 'master@acme.com', 'John Smith', NULL, NULL),
    ('[ACTUAL_MANAGER_USER_ID]', '550e8400-e29b-41d4-a716-446655440001', 'site_manager', 'manager.mumbai@acme.com', 'Priya Sharma', ARRAY['550e8400-e29b-41d4-a716-446655440011'], NULL),
    ('[ACTUAL_AUDITOR_USER_ID]', NULL, 'auditor', 'auditor@temp-audit.com', 'Mike Johnson', NULL, NOW() + INTERVAL '30 days'),
    ('[ACTUAL_ADMIN_USER_ID]', NULL, 'admin', 'admin@dashboard.com', 'System Admin', NULL, NULL)
```

### Step 5: Run Database Setup
```bash
# Reset and seed the database
supabase db reset

# Or push migrations if already set up
supabase db push
```

## Testing the Application

Once users are created and seed data is loaded:

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Try logging in with each demo user to test different access levels

## Troubleshooting

### 401 Authentication Errors
- Ensure all demo users are created in Supabase Auth
- Verify the profile IDs in `seed.sql` match the actual user IDs
- Check that users are confirmed (not pending email verification)

### Database Connection Issues
- Verify your `.env.local` has correct Supabase credentials
- Ensure the database is properly seeded with `supabase db reset`

### Permission Errors
- Check that RLS policies are properly configured
- Verify user roles are correctly assigned in the profiles table

## Current Status

✅ **Database Schema**: Complete with TimescaleDB hypertables
✅ **API Endpoints**: All REST endpoints implemented
✅ **Authentication**: Supabase Auth with role-based access
✅ **Frontend**: Complete dashboard with charts and navigation
✅ **Seed Data**: Ready (requires user ID updates)

🔄 **Next Steps**: Create demo users in Supabase Auth, then run seed data