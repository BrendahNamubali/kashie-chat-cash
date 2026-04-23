
-- Allow upserts to find conflicts by (user_id, date)
ALTER TABLE public.daily_entries
  ADD CONSTRAINT daily_entries_user_date_unique UNIQUE (user_id, date);
