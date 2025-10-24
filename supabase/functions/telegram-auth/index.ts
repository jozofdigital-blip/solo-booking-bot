import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramWebAppData(initData: string, botToken: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('No hash in initData');
      return false;
    }
    
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('Data check string:', dataCheckString);

    // Step 1: Create secret key = HMAC-SHA-256("WebAppData", bot_token)
    const webAppDataKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const secretKeyBytes = await crypto.subtle.sign(
      'HMAC',
      webAppDataKey,
      encoder.encode(botToken)
    );

    // Step 2: Calculate hash = HMAC-SHA-256(secret_key, data_check_string)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(dataCheckString)
    );

    const hashArray = Array.from(new Uint8Array(signature));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Calculated hash:', calculatedHash);
    console.log('Received hash:', hash);
    console.log('Match:', calculatedHash === hash);

    return calculatedHash === hash;
  } catch (error: any) {
    console.error('Verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    
    console.log('Received initData:', initData ? 'present' : 'missing');
    
    if (!initData) {
      throw new Error('No initData provided');
    }

    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // Verify Telegram data
    console.log('Starting verification...');
    const isValid = await verifyTelegramWebAppData(initData, BOT_TOKEN);
    
    if (!isValid) {
      console.error('Telegram data verification failed');
      throw new Error('Invalid Telegram data signature');
    }
    
    console.log('Telegram data verified successfully');

    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    if (!userJson) {
      throw new Error('No user data in initData');
    }

    const telegramUser = JSON.parse(userJson);
    console.log('Telegram user:', telegramUser);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const telegramId = telegramUser.id.toString();
    const email = `telegram_${telegramId}@looktime.pro`;

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const user = existingUsers?.users.find(u => 
      u.email === email || u.user_metadata?.telegram_id === telegramId
    );

    let authUser;
    if (user) {
      authUser = user;
      console.log('Existing user found:', authUser.id);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          photo_url: telegramUser.photo_url,
        },
      });

      if (createError) throw createError;
      authUser = newUser.user;
      console.log('New user created:', authUser.id);
    }

    // Create or update profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (!profile) {
      const businessName = telegramUser.first_name || 'Мой бизнес';
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authUser.id,
        business_name: businessName,
        telegram_chat_id: telegramId,
        avatar_url: telegramUser.photo_url || null,
      });
      if (profileError) console.error('Profile creation error:', profileError);
      console.log('Profile created');
    } else {
      const { error: updateError } = await supabase.from('profiles').update({
        telegram_chat_id: telegramId,
        avatar_url: telegramUser.photo_url || profile.avatar_url,
      }).eq('id', profile.id);
      if (updateError) console.error('Profile update error:', updateError);
      console.log('Profile updated');
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError) throw sessionError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        access_token: sessionData.properties?.action_link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});