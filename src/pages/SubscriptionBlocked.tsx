import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function SubscriptionBlocked() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          Пожалуйста, оплатите тариф
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Чтобы продолжить пользоваться приложением, необходимо оплатить тариф
        </p>

        <Button
          onClick={() => navigate("/subscription")}
          className="w-full bg-telegram hover:bg-telegram/90"
        >
          Выбрать тариф
        </Button>
      </Card>
    </div>
  );
}