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

    const url = new URL(req.url);
    const botType = url.searchParams.get('bot') || 'owner'; // 'owner' | 'client'
    const botToken = botType === 'client'
      ? Deno.env.get('TELEGRAM_CLIENT_BOT_TOKEN')
      : Deno.env.get('TELEGRAM_BOT_TOKEN');

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
          // Owner connection (only valid for owner bot)
          if (botType === 'client') {
            if (botToken) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: 'Эта ссылка предназначена для владельца. Пожалуйста, используйте клиентского бота.' }),
              });
            }
          } else {
            const profileId = param.replace('connect_', '');

            // Get user profile photos from Telegram
            let avatarUrl: string | null = null;
            if (botToken) {
              try {
                const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${chatId}&limit=1`);
                const photosData = await photosRes.json();
                
                if (photosData.ok && photosData.result?.photos?.length > 0) {
                  const fileId = photosData.result.photos[0][0].file_id;
                  const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                  const fileData = await fileRes.json();
                  
                  if (fileData.ok && fileData.result?.file_path) {
                    avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                  }
                }
              } catch (e) {
                console.error('Error fetching user photo:', e);
              }
            }

            const { error } = await supabase
              .from('profiles')
              .update({ 
                telegram_chat_id: chatId.toString(),
                avatar_url: avatarUrl
              })
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
          }
        } else if (param.startsWith('client_')) {
          // Client connection (only valid for client bot)
          if (botType !== 'client') {
            if (botToken) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: 'Эта ссылка предназначена для клиента. Пожалуйста, используйте бота для владельца для своих уведомлений.' }),
              });
            }
          } else {
            const value = param.replace('client_', '').trim();
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

            let updateError: any = null;
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
        }
      } else {
        // /start without parameters - show welcome message
        if (botToken) {
          const welcomeMessage = `Привет! 👋\n\nЧтобы открыть приложение - нажмите "Запустить"\n👇`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeMessage
            }),
          });
        }
      }
    }

    // Fallback: handle plain 'connect_<id>' or 'client_<value>' messages and /notify command
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = (update.message.text as string).trim();
      const userName = update.message.from?.first_name || update.message.from?.username || 'там';

      if (/^connect_[\w-]+$/.test(text)) {
        if (botType === 'client') {
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: 'Эта команда для владельца. Используйте клиентского бота.' }),
            });
          }
        } else {
          const profileId = text.replace('connect_', '');
          
          // Get user profile photos from Telegram
          let avatarUrl: string | null = null;
          if (botToken) {
            try {
              const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${chatId}&limit=1`);
              const photosData = await photosRes.json();
              
              if (photosData.ok && photosData.result?.photos?.length > 0) {
                const fileId = photosData.result.photos[0][0].file_id;
                const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                const fileData = await fileRes.json();
                
                if (fileData.ok && fileData.result?.file_path) {
                  avatarUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                }
              }
            } catch (e) {
              console.error('Error fetching user photo:', e);
            }
          }
          
          const { error } = await supabase
            .from('profiles')
            .update({ 
              telegram_chat_id: chatId.toString(),
              avatar_url: avatarUrl
            })
            .eq('id', profileId);
          if (error) {
            console.error('Error updating profile via fallback:', error);
          } else if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: '✅ Уведомления подключены' }),
            });
          }
        }
      } else if (/^client_[\w-]+$/.test(text)) {
        if (botType !== 'client') {
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: 'Эта команда для клиента. Используйте бота владельца.' }),
            });
          }
        } else {
          const value = text.replace('client_', '').trim();
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
          let updateError: any = null;
          if (isUUID) {
            const { error } = await supabase.from('clients').update({ telegram_chat_id: chatId.toString() }).eq('id', value);
            updateError = error;
          } else if (value) {
            const { error } = await supabase.from('clients').update({ telegram_chat_id: chatId.toString() }).eq('phone', value);
            updateError = error;
          }
          if (updateError) {
            console.error('Error updating client via fallback:', updateError);
          } else if (botToken) {
            const message = `✅ Отлично, ${userName}! Уведомления подключены.`;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: message }),
            });
          }
        }
      } else if (text.startsWith('/notify')) {
        if (botToken) {
          const help = botType === 'client'
            ? 'Чтобы подключить уведомления клиента, используйте ссылку из сообщения или отправьте: /start client_<id|phone>'
            : 'Чтобы подключить уведомления владельца, нажмите «Включить уведомления» в приложении или отправьте: /start connect_<id>';
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: help }),
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