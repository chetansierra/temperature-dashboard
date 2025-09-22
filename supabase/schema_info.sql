-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL,
  triggered_at timestamp with time zone DEFAULT now(),
  message text,
  resolved boolean DEFAULT false,
  CONSTRAINT alerts_pkey PRIMARY KEY (id),
  CONSTRAINT alerts_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.environments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT environments_pkey PRIMARY KEY (id),
  CONSTRAINT environments_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id)
);
CREATE TABLE public.readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sensor_id uuid NOT NULL,
  ts timestamp with time zone NOT NULL,
  temperature numeric,
  humidity numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT readings_pkey PRIMARY KEY (id),
  CONSTRAINT readings_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensors(id)
);
CREATE TABLE public.sensors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL,
  property text NOT NULL,
  location text,
  installed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sensors_pkey PRIMARY KEY (id),
  CONSTRAINT sensors_environment_id_fkey FOREIGN KEY (environment_id) REFERENCES public.environments(id)
);
CREATE TABLE public.sites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sites_pkey PRIMARY KEY (id),
  CONSTRAINT sites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);
CREATE TABLE public.thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['org'::text, 'site'::text, 'environment'::text, 'sensor'::text])),
  target_id uuid NOT NULL,
  min_value numeric,
  max_value numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT thresholds_pkey PRIMARY KEY (id),
  CONSTRAINT thresholds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'master'::text, 'site_manager'::text, 'auditor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
);