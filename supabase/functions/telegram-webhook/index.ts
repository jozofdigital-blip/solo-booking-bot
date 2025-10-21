import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update));

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    // Handle callback queries (future use)
    if (update.callback_query) {
      console.log('Callback query:', update.callback_query.data);
    }

    // Handle /start command with deep link
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const text: string = update.message.text;
      const parts = text.split(' ');
      
      if (parts.length > 1 && parts[1].startsWith('connect_')) {
        // Deep link connect flow
        const profileId = parts[1].replace('connect_', '');
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
          .from('profiles')
          .update({ telegram_chat_id: chatId.toString() })
          .eq('id', profileId);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        if (botToken) {
          const message = `✅ Готово, уведомления подключены!\n\nВы будете получать уведомления о новых записях и отменах.`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
          });
        }
      } else {
        // First-time start without deep link
        if (botToken) {
          const welcomeMessage = `👋 Добро пожаловать!\n\nЧтобы подключить уведомления, вернитесь в приложение и нажмите \"Подключить Telegram\" в разделе Уведомления.`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: welcomeMessage }),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in telegram webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
