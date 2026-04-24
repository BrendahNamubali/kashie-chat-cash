ALTER TABLE public.daily_entries
ADD COLUMN IF NOT EXISTS raw_input text;