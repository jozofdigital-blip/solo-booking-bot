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

    const { profileId, date } = await req.json();
    if (!profileId || !date) {
      return new Response(
        JSON.stringify({ error: 'profileId and date are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch only minimal fields to avoid exposing PII
    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_time, service_id, status')
      .eq('profile_id', profileId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (error) throw error;

    return new Response(
      JSON.stringify({ slots: data ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('get-busy-slots error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
