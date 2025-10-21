import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      const userName = update.message.from?.first_name || update.message.from?.username || 'там';
      const parts = text.split(' ');
      
      if (parts.length > 1) {
        const param = parts[1];
        
        if (param.startsWith('connect_')) {
          // Owner connection
          const profileId = param.replace('connect_', '');

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
        } else if (param.startsWith('client_')) {
          // Client connection - supports both client ID (UUID) and phone fallback
          const value = param.replace('client_', '').trim();
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

          let updateError = null;
          if (isUUID) {
            const { error } = await supabase
              .from('clients')
              .update({ telegram_chat_id: chatId.toString() })
              .eq('id', value);
            updateError = error;
          } else if (value) {
            const { error } = await supabase
              .from('clients')
              .update({ telegram_chat_id: chatId.toString() })
              .eq('phone', value);
            updateError = error;
          } else {
            updateError = new Error('Invalid client parameter');
          }

          if (updateError) {
            console.error('Error updating client:', updateError);
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                chat_id: chatId, 
                text: '❌ Произошла ошибка при подключении уведомлений. Попробуйте еще раз.' 
              }),
            });
          } else {
            if (botToken) {
              const message = `✅ Отлично, ${userName}!\n\nУведомления подключены. Мы напомним вам о предстоящих записях и сообщим об изменениях.`;
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message }),
              });
            }
          }
        }
      } else {
        // First-time start without deep link
        if (botToken) {
          const welcomeMessage = `Привет, ${userName}! 👋\n\nЯ бот для уведомлений о записях.\n\nЧтобы подключить уведомления, нажмите на ссылку в приложении или после создания записи.`;
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
