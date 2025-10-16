-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alert_rules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  conditions jsonb NOT NULL,
  severity USER-DEFINED DEFAULT 'medium'::alert_severity,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT alert_rules_pkey PRIMARY KEY (id),
  CONSTRAINT alert_rules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  alert_rule_id uuid,
  sensor_id uuid,
  severity USER-DEFINED NOT NULL,
  status USER-DEFINED DEFAULT 'active'::alert_status,
  title character varying NOT NULL,
  message text,
  triggered_at timestamp with time zone DEFAULT now(),
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT alerts_pkey PRIMARY KEY (id),
  CONSTRAINT alerts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT alerts_alert_rule_id_fkey FOREIGN KEY (alert_rule_id) REFERENCES public.alert_rules(id),
  CONSTRAINT alerts_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id),
  CONSTRAINT alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.profiles(id),
  CONSTRAINT alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.environments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  site_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  environment_type text NOT NULL DEFAULT 'other'::text CHECK (environment_type = ANY (ARRAY['cold_storage'::text, 'blast_freezer'::text, 'chiller'::text, 'other'::text])),
  CONSTRAINT environments_pkey PRIMARY KEY (id),
  CONSTRAINT environments_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id),
  CONSTRAINT environments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  tenant_id uuid,
  email character varying NOT NULL,
  role USER-DEFINED NOT NULL,
  full_name character varying,
  site_access ARRAY,
  auditor_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.readings (
  id uuid DEFAULT uuid_generate_v4(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature_c numeric NOT NULL,
  humidity numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.readings_2024 (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature_c numeric NOT NULL,
  humidity numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_2024_pkey PRIMARY KEY (id, ts),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.readings_2025 (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature_c numeric NOT NULL,
  humidity numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_2025_pkey PRIMARY KEY (id, ts),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.readings_2026 (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature_c numeric NOT NULL,
  humidity numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_2026_pkey PRIMARY KEY (id, ts),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.readings_2027 (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature_c numeric NOT NULL,
  humidity numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_2027_pkey PRIMARY KEY (id, ts),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.sensors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  environment_id uuid NOT NULL,
  site_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  sensor_type character varying DEFAULT 'temperature'::character varying,
  unit character varying DEFAULT 'celsius'::character varying,
  location_details text,
  is_active boolean DEFAULT true,
  last_reading_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sensor_id_local text,
  property_measured text NOT NULL DEFAULT 'temperature_c'::text,
  installation_date date,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'maintenance'::text, 'decommissioned'::text])),
  CONSTRAINT sensors_pkey PRIMARY KEY (id),
  CONSTRAINT sensors_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id),
  CONSTRAINT sensors_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id),
  CONSTRAINT sensors_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  location character varying,
  timezone character varying DEFAULT 'UTC'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sites_pkey PRIMARY KEY (id),
  CONSTRAINT sites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.thresholds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  environment_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  min_temperature numeric,
  max_temperature numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT thresholds_pkey PRIMARY KEY (id),
  CONSTRAINT thresholds_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id),
  CONSTRAINT thresholds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'master'::text, 'site_manager'::text, 'auditor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);