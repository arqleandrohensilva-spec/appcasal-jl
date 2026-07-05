ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS paid_invoices jsonb NOT NULL DEFAULT '{}'::jsonb;