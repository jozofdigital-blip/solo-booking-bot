import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [telegramUser, setTelegramUser] = useState<any>(null);

  useEffect(() => {
    authenticateWithTelegram();
  }, []);

  const authenticateWithTelegram = async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptAuth = async (): Promise<void> => {
      try {
        // Быстрая проверка авторизации
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard');
          return;
        }

        // Проверка Telegram Web App
        if (!window.Telegram?.WebApp) {
          toast.error('Это приложение работает только в Telegram');
          setLoading(false);
          return;
        }

        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        const initData = tg.initData;
        if (!initData) {
          toast.error('Не удалось получить данные Telegram');
          setLoading(false);
          return;
        }

        const user = tg.initDataUnsafe?.user;
        setTelegramUser(user);

        console.log('Attempting authentication, retry:', retryCount);

        // Авторизация через backend с увеличенным таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд

        try {
          const { data, error } = await supabase.functions.invoke('telegram-auth', {
            body: { initData },
          });

          clearTimeout(timeoutId);

          let respData = data;

          if (error || !respData) {
            console.warn('invoke failed, trying direct fetch fallback...', error);
            // Fallback: direct HTTP call to the Edge Function (in case some ISPs block invoke)
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const fallbackUrl = `https://${projectId}.functions.supabase.co/telegram-auth`;

            const fallbackController = new AbortController();
            const fallbackTimeout = setTimeout(() => fallbackController.abort(), 30000);

            const resp = await fetch(fallbackUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ initData }),
              signal: fallbackController.signal,
            });

            clearTimeout(fallbackTimeout);
            if (!resp.ok) {
              throw new Error(`Fallback request failed: ${resp.status}`);
            }
            respData = await resp.json();
          }

          console.log('Auth response received:', { 
            success: respData?.success, 
            hasHashedToken: !!respData?.hashed_token 
          });

          if (respData?.success && respData?.hashed_token) {
            console.log('Verifying OTP with hashed_token...');
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: respData.hashed_token,
              type: 'magiclink',
            });

            if (verifyError) {
              console.error('Verify OTP error:', verifyError);
              throw verifyError;
            }
            
            console.log('Authentication successful!');
            toast.success('Добро пожаловать!');
            navigate('/dashboard');
          } else {
            console.error('Invalid response data:', respData);
            throw new Error('Invalid authentication response');
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Обработка сетевых ошибок
          if (fetchError.name === 'AbortError' || 
              fetchError.message?.includes('Failed') ||
              fetchError.message?.includes('network') ||
              fetchError.message?.includes('Load failed')) {
            
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying authentication (${retryCount}/${maxRetries})...`);
              toast.info(`Повторная попытка ${retryCount}/${maxRetries}...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза 2 секунды
              return attemptAuth();
            }
          }
          
          throw fetchError;
        }
      } catch (error: any) {
        console.error('Auth error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        if (retryCount >= maxRetries) {
          toast.error('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
        } else {
          toast.error(error.message || 'Ошибка авторизации');
        }
        setLoading(false);
      }
    };

    await attemptAuth();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-telegram-light to-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-telegram/10 mb-4">
            <Send className="w-8 h-8 text-telegram" />
          </div>
          <h1 className="text-3xl font-bold mb-2">LookTime</h1>
          
          {loading ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Авторизация через Telegram...</p>
              <div className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg"></div>
              </div>
            </div>
          ) : telegramUser ? (
            <div className="space-y-4">
              <Avatar className="w-20 h-20 mx-auto">
                <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name} />
                <AvatarFallback>
                  {telegramUser.first_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <p className="text-lg font-medium">
                {telegramUser.first_name} {telegramUser.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Ошибка авторизации. Попробуйте перезапустить приложение.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Откройте приложение через Telegram
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
