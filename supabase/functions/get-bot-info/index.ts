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
    const clientToken = Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN');
    if (!clientToken) {
      throw new Error('TELEGRAM_CLIENT_BOT_TOKEN not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${clientToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      throw new Error('Failed to get bot info');
    }

    return new Response(
      JSON.stringify({ username: data.result.username }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error getting bot info:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
