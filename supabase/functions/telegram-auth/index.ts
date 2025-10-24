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
    const receivedHash = urlParams.get('hash');

    if (!receivedHash) {
      console.error('No hash in initData');
      return false;
    }

    // Exclude non-signable fields
    urlParams.delete('hash');
    urlParams.delete('signature');
    urlParams.delete('sign');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('Data check string:', dataCheckString);

    // Helper to compute HMAC-SHA256
    const hmac = async (keyData: ArrayBuffer, data: string) => {
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
      return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const botBytes = encoder.encode(botToken);
    const webAppBytes = encoder.encode('WebAppData');

    // Two possible secret derivations seen in community examples; accept either to be robust
    const secret1BytesSig = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', botBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), webAppBytes);
    const secret2BytesSig = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', webAppBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), botBytes);

    const calc1 = await hmac(secret1BytesSig, dataCheckString);
    const calc2 = await hmac(secret2BytesSig, dataCheckString);

    console.log('Received hash:', receivedHash);
    console.log('Calculated hash #1:', calc1);
    console.log('Calculated hash #2:', calc2);

    return receivedHash === calc1 || receivedHash === calc2;
  } catch (error: any) {
    console.error('Verification error:', error);
    return false;
  }
}

async function verifyWithAnyToken(initData: string, tokens: string[]): Promise<string | null> {
  for (const token of tokens) {
    const ok = await verifyTelegramWebAppData(initData, token);
    if (ok) return token;
  }
  return null;
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

    const TOKENS_RAW = Deno.env.get('TELEGRAM_BOT_TOKENS') || Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TOKENS_RAW) {
      throw new Error('TELEGRAM_BOT_TOKEN(S) not configured');
    }

    const tokens = TOKENS_RAW.split(',').map((s) => s.trim()).filter(Boolean);

    // Verify Telegram data
    console.log('Starting verification...');
    const matchedToken = await verifyWithAnyToken(initData, tokens);
    
    if (!matchedToken) {
      console.error('Telegram data verification failed');
      throw new Error('Invalid Telegram data signature');
    }
    
    console.log('Telegram data verified successfully with one of the configured tokens');

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
      const { data: slugRes, error: slugError } = await supabase.rpc('generate_unique_slug');
      if (slugError) console.error('Slug generation error:', slugError);
      const unique_slug = (slugRes as any) || `biz_${telegramId}`;
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authUser.id,
        business_name: businessName,
        unique_slug,
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
        action_link: sessionData.properties?.action_link,
        hashed_token: sessionData.properties?.hashed_token,
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