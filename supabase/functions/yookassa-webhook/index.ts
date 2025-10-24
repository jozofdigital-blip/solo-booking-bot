import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const notification = await req.json();
    console.log('Received YooKassa notification:', notification);

    const payment = notification.object;
    const paymentId = payment.id;
    const status = payment.status;

    // Update payment status in database
    await supabase
      .from('payments')
      .update({ status: status })
      .eq('payment_id', paymentId);

    // If payment is successful, activate subscription
    if (status === 'succeeded') {
      console.log('Payment succeeded, activating subscription');

      // Get payment details
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (paymentData) {
        // Calculate subscription end date
        const now = new Date();
        
        // Check if there's an existing active subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_end_date')
          .eq('id', paymentData.profile_id)
          .single();

        let endDate = new Date();
        
        // If there's an active subscription, extend from its end date
        if (profile?.subscription_end_date) {
          const existingEndDate = new Date(profile.subscription_end_date);
          if (existingEndDate > now) {
            endDate = existingEndDate;
          }
        }
        
        // Add months to the end date
        endDate.setMonth(endDate.getMonth() + paymentData.months);

        // Update profile with new subscription end date
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ subscription_end_date: endDate.toISOString() })
          .eq('id', paymentData.profile_id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        } else {
          console.log('Subscription activated until:', endDate);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});