import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'failed' | null>(null);
  const [telegramBotLink, setTelegramBotLink] = useState<string>("");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Load bot info
        const { data: botInfo } = await supabase.functions.invoke('get-bot-info');
        if (botInfo?.username) {
          setTelegramBotLink(`https://t.me/${botInfo.username}`);
        }

        // Get user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) {
          setPaymentStatus('failed');
          setLoading(false);
          return;
        }

        // Get most recent payment for this user
        const { data: payment, error } = await supabase
          .from('payments')
          .select('status, created_at')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching payment:', error);
          setPaymentStatus('failed');
        } else if (payment) {
          // Map YooKassa statuses to our statuses
          if (payment.status === 'succeeded') {
            setPaymentStatus('success');
          } else if (payment.status === 'pending' || payment.status === 'waiting_for_capture') {
            setPaymentStatus('pending');
          } else {
            setPaymentStatus('failed');
          }
        } else {
          // No payments found - user likely cancelled before payment was created
          setPaymentStatus('failed');
        }
      } catch (error) {
        console.error("Error checking payment:", error);
        setPaymentStatus('failed');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-telegram" />
      </div>
    );
  }

  const isSuccess = paymentStatus === 'success';
  const isPending = paymentStatus === 'pending';

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
        ) : isPending ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-yellow-600 dark:text-yellow-400 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Обработка платежа</h1>
            <p className="text-muted-foreground mb-8">
              Ваш платеж обрабатывается. Это может занять несколько минут.
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
              Платеж был отменен или не завершен. Попробуйте ещё раз или свяжитесь с поддержкой.
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

          {!isSuccess && !isPending && (
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
