import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  chatId: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  phone: string;
  appointmentId: string;
  appointmentDate: string;
  type: 'new' | 'cancelled';
  bookingUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const { chatId, clientName, serviceName, date, time, phone, appointmentId, appointmentDate, type, bookingUrl }: NotificationRequest = await req.json();

    const isNew = type === 'new';
    const emoji = isNew ? '🔔' : '❌';
    const title = isNew ? 'Новая запись!' : 'Запись отменена';
    
    const message = `
${emoji} *${title}*

📅 ${date}, ${time}
👤 ${clientName}
📱 ${phone}
💅 ${serviceName}
`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Create deep link to appointment with date navigation
    const viewUrl = `${bookingUrl}?view=appointment&id=${appointmentId}&date=${appointmentDate}&highlight=${isNew ? 'green' : 'red'}`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '➡️ Перейти',
                url: viewUrl
              }
            ]
          ]
        }
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Telegram API error:', result);
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    console.log('Notification sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error sending telegram notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});