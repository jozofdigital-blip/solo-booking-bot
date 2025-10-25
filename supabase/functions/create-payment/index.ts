import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  planId: string;
  amount: number;
  description: string;
  profileId: string;
  months: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopId = Deno.env.get('YOOKASSA_SHOP_ID');
    const secretKey = Deno.env.get('YOOKASSA_SECRET_KEY');
    
    if (!shopId || !secretKey) {
      throw new Error('YooKassa credentials not configured');
    }

    const { planId, amount, description, profileId, months }: CreatePaymentRequest = await req.json();

    console.log('Creating payment:', { planId, amount, description, profileId, months });

    // Create base64 encoded credentials for YooKassa
    const credentials = btoa(`${shopId}:${secretKey}`);
    
    // Generate unique idempotency key
    const idempotencyKey = `${profileId}-${planId}-${Date.now()}`;

    // Create payment in YooKassa
    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Idempotence-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: 'https://looktime.pro/payment-result?payment=success'
        },
        capture: true,
        description: description,
        metadata: {
          profile_id: profileId,
          plan_id: planId,
          months: months.toString()
        }
      })
    });

    if (!yookassaResponse.ok) {
      const errorData = await yookassaResponse.json();
      console.error('YooKassa error:', errorData);
      throw new Error(`YooKassa error: ${JSON.stringify(errorData)}`);
    }

    const paymentData = await yookassaResponse.json();
    console.log('Payment created:', paymentData);

    // Save payment info to database for tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('payments')
      .insert({
        payment_id: paymentData.id,
        profile_id: profileId,
        amount: amount,
        status: paymentData.status,
        plan_id: planId,
        months: months
      });

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        confirmationUrl: paymentData.confirmation.confirmation_url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});