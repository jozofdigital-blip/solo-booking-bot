import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;

    console.log('Setting webhook to:', webhookUrl);

    // Use JSON body to set allowed updates explicitly
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query", "my_chat_member", "chat_member"],
          drop_pending_updates: false
        })
      }
    );

    const result = await response.json();
    console.log('Webhook setup result:', result);

    // Bot info
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const me = await meRes.json();

    // Also get webhook info to verify
    const infoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );
    const info = await infoResponse.json();
    console.log('Webhook info:', info);

    return new Response(
      JSON.stringify({ 
        setup: result,
        me,
        info
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error setting up webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
