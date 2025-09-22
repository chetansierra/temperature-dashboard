import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string | null
          email: string
          role: 'master' | 'site_manager' | 'auditor' | 'admin'
          site_id: string | null
          access_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          email: string
          role: 'master' | 'site_manager' | 'auditor' | 'admin'
          site_id?: string | null
          access_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          email?: string
          role?: 'master' | 'site_manager' | 'auditor' | 'admin'
          site_id?: string | null
          access_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          tenant_id: string
          site_name: string
          site_code: string
          location: any | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          site_name: string
          site_code: string
          location?: any | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          site_name?: string
          site_code?: string
          location?: any | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      environments: {
        Row: {
          id: string
          site_id: string
          tenant_id: string
          environment_type: 'cold_storage' | 'blast_freezer' | 'chiller' | 'other'
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          tenant_id: string
          environment_type: 'cold_storage' | 'blast_freezer' | 'chiller' | 'other'
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          tenant_id?: string
          environment_type?: 'cold_storage' | 'blast_freezer' | 'chiller' | 'other'
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sensors: {
        Row: {
          id: string
          tenant_id: string
          site_id: string
          environment_id: string
          sensor_id_local: string | null
          property_measured: string
          installation_date: string | null
          location_details: string | null
          status: 'active' | 'maintenance' | 'decommissioned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          site_id: string
          environment_id: string
          sensor_id_local?: string | null
          property_measured?: string
          installation_date?: string | null
          location_details?: string | null
          status?: 'active' | 'maintenance' | 'decommissioned'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          site_id?: string
          environment_id?: string
          sensor_id_local?: string | null
          property_measured?: string
          installation_date?: string | null
          location_details?: string | null
          status?: 'active' | 'maintenance' | 'decommissioned'
          created_at?: string
          updated_at?: string
        }
      }
      readings: {
        Row: {
          ts: string
          sensor_id: string
          value: number
          created_at: string
        }
        Insert: {
          ts: string
          sensor_id: string
          value: number
          created_at?: string
        }
        Update: {
          ts?: string
          sensor_id?: string
          value?: number
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          rule_id: string
          tenant_id: string
          site_id: string
          environment_id: string | null
          sensor_id: string | null
          level: 'warning' | 'critical'
          status: 'open' | 'acknowledged' | 'resolved'
          message: string
          value: number | null
          threshold_min: number | null
          threshold_max: number | null
          opened_at: string
          acknowledged_at: string | null
          resolved_at: string | null
          acknowledged_by: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          tenant_id: string
          site_id: string
          environment_id?: string | null
          sensor_id?: string | null
          level: 'warning' | 'critical'
          status?: 'open' | 'acknowledged' | 'resolved'
          message: string
          value?: number | null
          threshold_min?: number | null
          threshold_max?: number | null
          opened_at?: string
          acknowledged_at?: string | null
          resolved_at?: string | null
          acknowledged_by?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          tenant_id?: string
          site_id?: string
          environment_id?: string | null
          sensor_id?: string | null
          level?: 'warning' | 'critical'
          status?: 'open' | 'acknowledged' | 'resolved'
          message?: string
          value?: number | null
          threshold_min?: number | null
          threshold_max?: number | null
          opened_at?: string
          acknowledged_at?: string | null
          resolved_at?: string | null
          acknowledged_by?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      readings_hourly: {
        Row: {
          bucket: string
          sensor_id: string
          avg_value: number
          min_value: number
          max_value: number
          reading_count: number
        }
      }
      readings_daily: {
        Row: {
          bucket: string
          sensor_id: string
          avg_value: number
          min_value: number
          max_value: number
          reading_count: number
        }
      }
    }
  }
}
