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
    try {
      // Check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
        return;
      }

      // Check if Telegram Web App is available
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

      // Authenticate with backend
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData }
      });

      if (error) throw error;

      if (data?.success) {
        const tokenHash = data.hashed_token;
        if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });

          if (verifyError) throw verifyError;
          
          toast.success('Добро пожаловать!');
          navigate('/dashboard');
        } else {
          throw new Error('Invalid magic link');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Ошибка авторизации');
      setLoading(false);
    }
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
