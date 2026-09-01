SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('theme_preference', 'notification_prefs', 'resume_data')
ORDER BY column_name;
