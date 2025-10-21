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

    // Handle /start command with deep link
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const parts = text.split(' ');
      
      // Check if this is a deep link with profile ID
      if (parts.length > 1 && parts[1].startsWith('connect_')) {
        const profileId = parts[1].replace('connect_', '');
        
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Update profile with chat_id
        const { error } = await supabase
          .from('profiles')
          .update({ telegram_chat_id: chatId.toString() })
          .eq('id', profileId);

        if (error) {
          console.error('Error updating profile:', error);
          throw error;
        }

        // Send success message
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const message = `✅ Готово, уведомления подключены!\n\nВы будете получать уведомления о новых записях и отменах.`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        });
      } else {
        // First time user - send welcome message
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const welcomeMessage = `👋 Добро пожаловать в LookTime!\n\nДля подключения уведомлений перейдите в настройки вашего кабинета и нажмите "Включить уведомления".`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in telegram webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
