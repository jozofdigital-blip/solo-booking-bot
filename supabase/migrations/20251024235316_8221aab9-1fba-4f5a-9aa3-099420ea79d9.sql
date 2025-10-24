-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  months INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = payments.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_payments_profile_id ON public.payments(profile_id);
CREATE INDEX idx_payments_payment_id ON public.payments(payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Add trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.payments IS 'Payment transactions for subscriptions';
COMMENT ON COLUMN public.payments.payment_id IS 'YooKassa payment ID';
COMMENT ON COLUMN public.payments.status IS 'Payment status from YooKassa';