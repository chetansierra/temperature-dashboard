-- =============================================
-- ADD NEW ROLE ENUM VALUES
-- Migration: 20251014140840_add_new_role_enum_values
-- =============================================

-- Add new enum values for the role system
-- This needs to be in a separate transaction from using the values

DO $$
BEGIN
    -- Add new enum values if using enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Add master_user enum value
        BEGIN
            ALTER TYPE user_role ADD VALUE 'master_user';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, continue
        END;
        
        -- Add user enum value if it doesn't exist
        BEGIN
            ALTER TYPE user_role ADD VALUE 'user';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, continue
        END;
    END IF;
END $$;

-- Migration complete
SELECT 'New role enum values added successfully' AS status;