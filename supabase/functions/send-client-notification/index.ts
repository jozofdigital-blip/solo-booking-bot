import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientNotificationRequest {
  chatId: string;
  type: 'confirmation' | 'reminder' | 'cancellation' | 'update';
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName: string;
  address?: string;
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

    const { 
      chatId, 
      type, 
      clientName, 
      serviceName, 
      date, 
      time, 
      businessName,
      address 
    }: ClientNotificationRequest = await req.json();

    let message = '';
    let emoji = '';

    switch (type) {
      case 'confirmation':
        emoji = '✅';
        message = `${emoji} *Запись подтверждена*\n\n`;
        message += `Здравствуйте, ${clientName}!\n\n`;
        message += `📅 Дата: ${date}\n`;
        message += `🕐 Время: ${time}\n`;
        message += `💅 Услуга: ${serviceName}\n`;
        message += `🏢 Салон: ${businessName}\n`;
        if (address) {
          message += `📍 Адрес: ${address}\n`;
        }
        message += `\nЖдём вас! 😊`;
        break;

      case 'reminder':
        emoji = '⏰';
        message = `${emoji} *Напоминание о записи*\n\n`;
        message += `Здравствуйте, ${clientName}!\n\n`;
        message += `Напоминаем, что завтра у вас запись:\n\n`;
        message += `📅 ${date}\n`;
        message += `🕐 ${time}\n`;
        message += `💅 ${serviceName}\n`;
        message += `🏢 ${businessName}\n`;
        if (address) {
          message += `📍 ${address}\n`;
        }
        message += `\nБудем рады вас видеть! 😊`;
        break;

      case 'cancellation':
        emoji = '❌';
        message = `${emoji} *Запись отменена*\n\n`;
        message += `Здравствуйте, ${clientName}!\n\n`;
        message += `К сожалению, ваша запись была отменена:\n\n`;
        message += `📅 ${date}, ${time}\n`;
        message += `💅 ${serviceName}\n`;
        message += `🏢 ${businessName}\n`;
        message += `\nПриносим извинения за неудобства.`;
        break;

      case 'update':
        emoji = '📝';
        message = `${emoji} *Изменение записи*\n\n`;
        message += `Здравствуйте, ${clientName}!\n\n`;
        message += `Информация о вашей записи изменилась:\n\n`;
        message += `📅 Новая дата: ${date}\n`;
        message += `🕐 Новое время: ${time}\n`;
        message += `💅 Услуга: ${serviceName}\n`;
        message += `🏢 ${businessName}\n`;
        if (address) {
          message += `📍 ${address}\n`;
        }
        break;

      default:
        throw new Error('Unknown notification type');
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Telegram API error:', result);
      throw new Error(`Telegram API error: ${result.description || 'Unknown error'}`);
    }

    console.log('Client notification sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error sending client notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
