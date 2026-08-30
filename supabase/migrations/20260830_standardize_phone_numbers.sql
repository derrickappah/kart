-- Migration to standardize existing phone numbers to international format (+233XXXXXXXXX)

-- 1. Standardize 10-digit Ghanaian phone numbers starting with '0' (e.g. '0243953094' -> '+233243953094', '0599342940' -> '+233599342940')
UPDATE public.profiles
SET phone = '+233' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM 2)
WHERE phone IS NOT NULL 
  AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$';

-- 2. Standardize 9-digit Ghanaian phone numbers missing leading 0 (e.g. '243953094' -> '+233243953094', '599342940' -> '+233599342940')
UPDATE public.profiles
SET phone = '+233' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^[235][0-9]{8}$';

-- 3. Standardize 12-digit Ghanaian phone numbers starting with '233' without '+' (e.g. '233243953094' -> '+233243953094')
UPDATE public.profiles
SET phone = '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^233[0-9]{9}$';

-- 4. Clean up spaces/symbols/dashes for existing numbers starting with '+'
UPDATE public.profiles
SET phone = '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND phone LIKE '+%'
  AND phone <> '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g');

-- 5. Standardize phone_verifications table if any records exist
UPDATE public.phone_verifications
SET phone = '+233' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g') FROM 2)
WHERE phone IS NOT NULL 
  AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$';

UPDATE public.phone_verifications
SET phone = '+' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
WHERE phone IS NOT NULL 
  AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') ~ '^233[0-9]{9}$';

-- 6. Standardize platform_settings default whatsapp support number if stored as 05...
UPDATE public.platform_settings
SET value = '"\+233500502158"'
WHERE key = 'whatsapp_support_number'
  AND (value = '"0500502158"' OR value = '0500502158');
