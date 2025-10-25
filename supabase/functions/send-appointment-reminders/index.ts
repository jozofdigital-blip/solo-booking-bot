import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toZonedTime, format as formatTz } from "https://esm.sh/date-fns-tz@3.1.3";
import { format } from "https://esm.sh/date-fns@3.6.0";
import { ru } from "https://esm.sh/date-fns@3.6.0/locale/ru";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting reminder check...');

    // Get all profiles with their timezones
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, timezone, business_name, address, notify_1h_before, notify_24h_before');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    let sentCount = 0;

    // Process each profile with its timezone
    for (const profile of profiles || []) {
      const profileTimezone = profile.timezone || 'Europe/Moscow';
      
      // Get current time in profile's timezone
      const now = new Date();
      const nowInProfileTz = toZonedTime(now, profileTimezone);
      
      const currentHour = nowInProfileTz.getHours();
      const currentMinute = nowInProfileTz.getMinutes();
      
      console.log(`Checking profile ${profile.id} (${profileTimezone}): ${nowInProfileTz.toISOString()}`);

      // Get today's date in YYYY-MM-DD format (profile timezone)
      const todayStr = format(nowInProfileTz, 'yyyy-MM-dd');
      
      // Get tomorrow's date
      const tomorrow = new Date(nowInProfileTz);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

      console.log(`Checking appointments for profile ${profile.id}: today=${todayStr}, tomorrow=${tomorrowStr}`);

      // Get all pending appointments for this profile for today and tomorrow
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          services!inner(
            name
          )
        `)
        .eq('profile_id', profile.id)
        .in('appointment_date', [todayStr, tomorrowStr])
        .eq('status', 'pending');

      if (appointmentsError) {
        console.error(`Error fetching appointments for profile ${profile.id}:`, appointmentsError);
        continue;
      }

      console.log(`Found ${appointments?.length || 0} appointments for profile ${profile.id}`);

      // Get all clients with telegram_chat_id for this profile
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profile.id)
        .not('telegram_chat_id', 'is', null);

      if (clientsError) {
        console.error(`Error fetching clients for profile ${profile.id}:`, clientsError);
        continue;
      }

      // Create a map of clients by phone for quick lookup
      const clientMap = new Map();
      clients?.forEach(client => {
        clientMap.set(client.phone, client);
      });

      for (const appointment of appointments || []) {
        const service = appointment.services;
        
        // Find client by phone
        const client = clientMap.get(appointment.client_phone);
        
        // Skip if client doesn't have Telegram
        if (!client || !client.telegram_chat_id) {
          continue;
        }
        
        // Parse appointment time
        const [aptHour, aptMinute] = appointment.appointment_time.split(':').map(Number);
        const appointmentDate = appointment.appointment_date;

        // Check for 1-hour reminder
        if (profile.notify_1h_before && 
            !appointment.notification_sent_1h && 
            appointmentDate === todayStr) {
          
          // Calculate time difference in minutes
          const aptTimeInMinutes = aptHour * 60 + aptMinute;
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          const minutesUntilAppointment = aptTimeInMinutes - currentTimeInMinutes;

          // Send reminder if appointment is in 50-70 minutes (to account for cron timing)
          if (minutesUntilAppointment >= 50 && minutesUntilAppointment <= 70) {
            console.log(`Sending 1-hour reminder for appointment ${appointment.id}`);
            
            try {
              await supabase.functions.invoke('send-client-notification', {
                body: {
                  chatId: client.telegram_chat_id,
                  type: 'reminder_1h',
                  clientName: client.name,
                  serviceName: service.name,
                  date: formatDate(appointmentDate),
                  time: appointment.appointment_time.substring(0, 5),
                  businessName: profile.business_name,
                  address: profile.address,
                  myAppointmentsUrl: 'https://looktime.pro/my-appointments',
                },
              });

              // Mark notification as sent
              await supabase
                .from('appointments')
                .update({ notification_sent_1h: true })
                .eq('id', appointment.id);

              sentCount++;
              console.log(`1-hour reminder sent for appointment ${appointment.id}`);
            } catch (error) {
              console.error(`Failed to send 1-hour reminder for appointment ${appointment.id}:`, error);
            }
          }
        }

        // Check for 24-hour reminder
        if (profile.notify_24h_before && 
            !appointment.notification_sent_24h && 
            appointmentDate === tomorrowStr) {
          
          // Send reminder if it's approximately the same time tomorrow (within 1 hour window)
          const timeDiff = Math.abs(aptHour - currentHour);
          if (timeDiff <= 1 || timeDiff === 23) { // Account for hour boundary
            console.log(`Sending 24-hour reminder for appointment ${appointment.id}`);
            
            try {
              await supabase.functions.invoke('send-client-notification', {
                body: {
                  chatId: client.telegram_chat_id,
                  type: 'reminder_24h',
                  clientName: client.name,
                  serviceName: service.name,
                  date: formatDate(appointmentDate),
                  time: appointment.appointment_time.substring(0, 5),
                  businessName: profile.business_name,
                  address: profile.address,
                  myAppointmentsUrl: 'https://looktime.pro/my-appointments',
                },
              });

              // Mark notification as sent
              await supabase
                .from('appointments')
                .update({ notification_sent_24h: true })
                .eq('id', appointment.id);

              sentCount++;
              console.log(`24-hour reminder sent for appointment ${appointment.id}`);
            } catch (error) {
              console.error(`Failed to send 24-hour reminder for appointment ${appointment.id}:`, error);
            }
          }
        }
      }
    }

    console.log(`Reminder check completed. Sent ${sentCount} reminders.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${sentCount} reminders`,
        checkedProfiles: profiles?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error in send-appointment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to format date in Russian locale
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}
