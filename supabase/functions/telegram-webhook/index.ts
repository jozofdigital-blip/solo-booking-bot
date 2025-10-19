import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!botToken || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const update: TelegramUpdate = await req.json();

    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Handle /start command
      if (text === '/start') {
        // Check if this chat_id is already linked to a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('telegram_chat_id', chatId.toString())
          .single();

        let responseMessage = '';
        
        if (profile) {
          // Update the profile to confirm the chat_id is active
          await supabase
            .from('profiles')
            .update({ telegram_chat_id: chatId.toString() })
            .eq('telegram_chat_id', chatId.toString());
            
          responseMessage = `✅ Уведомления активированы для "${profile.business_name}"!\n\n🔔 Вы будете получать напоминания за 1 час до записи.`;
        } else {
          responseMessage = `👋 Добро пожаловать!\n\nДля активации уведомлений перейдите в настройки вашего профиля и нажмите "Включить уведомления в Telegram".`;
        }

        // Send response message
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseMessage,
            parse_mode: 'Markdown',
          }),
        });
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
    console.error('Error handling telegram webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});