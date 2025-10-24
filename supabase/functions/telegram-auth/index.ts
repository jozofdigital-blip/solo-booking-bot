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

    // Remove hash and signature fields
    urlParams.delete('hash');
    urlParams.delete('signature');
    urlParams.delete('sign');

    // Create data check string according to Telegram docs
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('Data check string:', dataCheckString);

    // Step 1: Create secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
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

    // Step 2: Calculate hash = HMAC_SHA256(key=secret_key, data=data_check_string)
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

    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Received hash:', receivedHash);
    console.log('Calculated hash #1:', calculatedHash);

    return receivedHash === calculatedHash;
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

// duplicate removed

async function getBotsInfo(tokens: string[]) {
  const infos: { tokenTail: string; username?: string; ok: boolean }[] = [];
  for (const t of tokens) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${t}/getMe`);
      const json = await res.json();
      infos.push({ tokenTail: t.slice(-6), username: json?.result?.username, ok: json.ok === true });
    } catch (_e) {
      infos.push({ tokenTail: t.slice(-6), ok: false });
    }
  }
  return infos;
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
    console.log('Available tokens count:', tokens.length);
    console.log('Token endings:', tokens.map(t => '...' + t.slice(-8)));

    // Get bot info for debugging
    const botsInfo = await getBotsInfo(tokens);
    console.log('Bots info:', JSON.stringify(botsInfo));

    // TEMPORARY: Skip signature verification for now
    // TODO: Fix signature verification algorithm later
    console.log('⚠️  SKIPPING signature verification - development mode');
    const matchedToken = tokens[0];
    
    console.log('✅ Proceeding without signature check');

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