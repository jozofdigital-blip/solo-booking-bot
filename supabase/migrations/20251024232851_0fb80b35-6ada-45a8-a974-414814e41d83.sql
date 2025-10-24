-- Add subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 days');

-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active promo codes
CREATE POLICY "Anyone can view active promo codes"
ON public.promo_codes
FOR SELECT
USING (is_active = true);

-- Insert default promo codes
INSERT INTO public.promo_codes (code, discount_percent) VALUES
  ('Промо10', 10),
  ('Лук20', 20),
  ('Макси50', 50),
  ('Отдуши100', 100);

COMMENT ON COLUMN public.profiles.subscription_end_date IS 'End date of paid subscription';
COMMENT ON COLUMN public.profiles.trial_end_date IS 'End date of free trial period';
COMMENT ON TABLE public.promo_codes IS 'Promotional discount codes';