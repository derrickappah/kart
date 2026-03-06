-- Rename linkedin column to snapchat in profiles table
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'linkedin'
    ) THEN
        ALTER TABLE profiles RENAME COLUMN linkedin TO snapchat;
    END IF;
END $$;
