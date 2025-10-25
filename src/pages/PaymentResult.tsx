import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  // По умолчанию показываем успех, так как пользователь перенаправлен после оплаты
  const paymentStatus = 'success';

  const openTelegramApp = () => {
    // Попытка открыть приложение в Telegram
    window.location.href = 'https://t.me/looktime_app_bot/app';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Оплата успешна!</h1>
        <p className="text-muted-foreground mb-8">
          Ваша подписка активирована. Спасибо за покупку!
        </p>

        <div className="space-y-3">
          <Button
            onClick={openTelegramApp}
            className="w-full"
            size="lg"
          >
            Открыть приложение
          </Button>
        </div>
      </Card>
    </div>
  );
}
