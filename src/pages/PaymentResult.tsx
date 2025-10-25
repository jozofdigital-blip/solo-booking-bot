import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [telegramBotLink, setTelegramBotLink] = useState<string>("");
  const paymentStatus = searchParams.get('payment');

  useEffect(() => {
    loadBotInfo();
  }, []);

  const loadBotInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: botInfo } = await supabase.functions.invoke('get-bot-info');
      
      if (botInfo?.username) {
        setTelegramBotLink(`https://t.me/${botInfo.username}`);
      }
    } catch (error) {
      console.error("Error loading bot info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-telegram" />
      </div>
    );
  }

  const isSuccess = paymentStatus === 'success';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {isSuccess ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Оплата успешна!</h1>
            <p className="text-muted-foreground mb-8">
              Ваша подписка активирована. Спасибо за покупку!
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Оплата не прошла</h1>
            <p className="text-muted-foreground mb-8">
              Что-то пошло не так. Попробуйте ещё раз или свяжитесь с поддержкой.
            </p>
          </>
        )}

        <div className="space-y-3">
          {telegramBotLink && (
            <Button
              onClick={() => window.open(telegramBotLink, '_blank')}
              className="w-full bg-telegram hover:bg-telegram/90"
              size="lg"
            >
              Перейти в Telegram-бот
            </Button>
          )}
          
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Перейти в личный кабинет
          </Button>

          {!isSuccess && (
            <Button
              onClick={() => navigate('/subscription')}
              variant="ghost"
              className="w-full"
            >
              Попробовать снова
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
