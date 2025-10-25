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
    console.log('Received YooKassa notification:', JSON.stringify(notification, null, 2));

    const eventType = notification.event;
    const payment = notification.object;
    const paymentId = payment.payment_id || payment.id;
    const status = payment.status;

    console.log('Event type:', eventType, 'Payment ID:', paymentId, 'Status:', status);

    // Handle refund event
    if (eventType === 'refund.succeeded') {
      console.log('Processing refund for payment:', paymentId);
      
      // Get payment details
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*, profiles!inner(user_id)')
        .eq('payment_id', paymentId)
        .single();

      console.log('Payment data found:', paymentData ? 'Yes' : 'No', 'Error:', paymentError);

      if (paymentData) {
        console.log('Profile ID:', paymentData.profile_id, 'User ID:', paymentData.profiles?.user_id);
        
        // Cancel subscription by removing subscription_end_date
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ subscription_end_date: null })
          .eq('id', paymentData.profile_id);

        if (updateError) {
          console.error('Error cancelling subscription:', updateError);
        } else {
          console.log('✅ Subscription cancelled for profile:', paymentData.profile_id);
        }
        
        // Update payment status to refunded
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('payment_id', paymentId);
        
        console.log('✅ Payment status updated to refunded');
      } else {
        console.error('❌ Payment not found for ID:', paymentId);
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

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
        .select('*, profiles!inner(user_id)')
        .eq('payment_id', paymentId)
        .single();

      if (paymentData) {
        console.log('Activating for Profile ID:', paymentData.profile_id, 'User ID:', paymentData.profiles?.user_id, 'Months:', paymentData.months);
        
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
          console.log('✅ Subscription activated until:', endDate);
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