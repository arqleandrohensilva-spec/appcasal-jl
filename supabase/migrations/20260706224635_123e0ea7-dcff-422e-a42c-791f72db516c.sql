ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS recurrence_weekdays smallint[],
  ADD COLUMN IF NOT EXISTS recurrence_interval_days smallint;