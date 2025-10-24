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
    const ownerToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const clientToken = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN');

    if (!ownerToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');
    if (!clientToken) throw new Error('TELEGRAM_CLIENT_BOT_TOKEN not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const ownerWebhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?bot=owner`;
    const clientWebhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?bot=client`;

    // Helper to set webhook
    const setWebhook = async (token: string, url: string) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          allowed_updates: ["message", "callback_query", "my_chat_member", "chat_member"],
          drop_pending_updates: false,
        }),
      });
      const result = await res.json();
      const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();
      const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
      return { result, me, info };
    };

    const [owner, client] = await Promise.all([
      setWebhook(ownerToken, ownerWebhookUrl),
      setWebhook(clientToken, clientWebhookUrl),
    ]);

    return new Response(
      JSON.stringify({ owner, client }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error setting up webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});