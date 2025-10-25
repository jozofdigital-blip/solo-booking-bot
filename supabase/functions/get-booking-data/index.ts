import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Backend configuration missing');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { profileId, startDate, endDate } = await req.json();

    if (!profileId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'profileId, startDate and endDate are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Fetching appointments for:', { profileId, startDate, endDate });

    // Fetch all appointments for the date range in one query
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time, service_id, status, services(duration_minutes)')
      .eq('profile_id', profileId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} appointments`);
    if (appointments && appointments.length > 0) {
      console.log('Sample appointment:', appointments[0]);
    }

    // Calculate busy counts per day
    const busyCounts: Record<string, number> = {};
    const slotsByDate: Record<string, any[]> = {};
    
    for (const apt of (appointments ?? [])) {
      const date = apt.appointment_date;
      busyCounts[date] = (busyCounts[date] || 0) + 1;
      
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push({
        appointment_time: apt.appointment_time,
        service_id: apt.service_id,
        status: apt.status,
        duration_minutes: (apt.services as any)?.duration_minutes || 60
      });
    }

    console.log('Busy counts:', busyCounts);
    console.log('Days with slots:', Object.keys(slotsByDate));

    return new Response(
      JSON.stringify({ busyCounts, slotsByDate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('get-booking-data error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
