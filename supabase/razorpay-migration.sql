-- EventHub: Razorpay Test Mode payment tracking
-- Run once in Supabase SQL Editor. Keep Row Level Security enabled.
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_razorpay_order_id_unique
  ON public.registrations (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS registrations_razorpay_payment_id_unique
  ON public.registrations (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
