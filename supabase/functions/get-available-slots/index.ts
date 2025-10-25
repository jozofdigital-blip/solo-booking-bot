import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function timeToMinutes(time: string): number {
  const [h, m] = time.substring(0,5).split(':').map(Number);
  return h * 60 + m;
}

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

    const { profileId, date, serviceId } = await req.json();
    if (!profileId || !date || !serviceId) {
      return new Response(
        JSON.stringify({ error: 'profileId, date and serviceId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) throw (serviceError || new Error('Service not found'));
    const serviceDuration = service.duration_minutes || 60;

    // Working hours for that weekday
    const target = new Date(`${date}T00:00:00`);
    const weekday = target.getDay(); // 0..6

    const { data: whRows, error: whError } = await supabase
      .from('working_hours')
      .select('start_time, end_time, is_working, day_of_week')
      .eq('profile_id', profileId)
      .eq('day_of_week', weekday)
      .maybeSingle();

    if (whError) throw whError;
    if (!whRows || !whRows.is_working) {
      return new Response(
        JSON.stringify({ slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const startMins = timeToMinutes(whRows.start_time);
    const endMins = timeToMinutes(whRows.end_time);

    // Get appointments with service durations
    const { data: apts, error: aptsError } = await supabase
      .from('appointments')
      .select('appointment_time, status, service_id, services(duration_minutes)')
      .eq('profile_id', profileId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (aptsError) throw aptsError;

    const busy = (apts ?? []).map((a: any) => {
      const start = timeToMinutes(a.appointment_time);
      const dur = a.services?.duration_minutes ?? 60;
      const end = start + dur;
      return { start, end };
    });

    const slots: string[] = [];
    for (let t = startMins; t + serviceDuration <= endMins; t += 30) {
      const slotStart = t;
      const slotEnd = t + serviceDuration;
      const overlap = busy.some(b => slotStart < b.end && b.start < slotEnd);
      if (!overlap) {
        const hh = String(Math.floor(t/60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }

    console.log('get-available-slots', { profileId, date, serviceId, count: slots.length });

    return new Response(
      JSON.stringify({ slots }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('get-available-slots error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});