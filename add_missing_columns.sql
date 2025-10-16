-- =============================================
-- ADD MISSING COLUMNS
-- =============================================

-- Add last_login column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add any other commonly expected columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('last_login', 'phone', 'avatar_url')
ORDER BY column_name;

SELECT 'Missing columns added successfully!' AS result;