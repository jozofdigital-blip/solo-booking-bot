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

    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('profile_id', profileId)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .neq('status', 'cancelled');

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const date = (row as any).appointment_date as string;
      counts[date] = (counts[date] || 0) + 1;
    }

    console.log('get-busy-days range', { profileId, startDate, endDate, days: Object.keys(counts).length });

    return new Response(
      JSON.stringify({ counts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('get-busy-days error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});