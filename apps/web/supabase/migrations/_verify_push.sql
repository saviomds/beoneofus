SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;
