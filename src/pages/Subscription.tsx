import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Check } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ru } from "date-fns/locale";

const PLANS = [
  { id: "3months", name: "3 месяца", price: 750, months: 3 },
  { id: "6months", name: "6 месяцев", price: 1300, months: 6 },
  { id: "12months", name: "1 год", price: 2200, months: 12 },
];

export default function Subscription() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
      calculateDaysLeft(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = (profileData: any) => {
    const now = new Date();
    
    if (profileData.subscription_end_date) {
      const endDate = new Date(profileData.subscription_end_date);
      const days = differenceInDays(endDate, now);
      setDaysLeft(days > 0 ? days : 0);
    } else if (profileData.trial_end_date) {
      const trialEnd = new Date(profileData.trial_end_date);
      const days = differenceInDays(trialEnd, now);
      setDaysLeft(days > 0 ? days : 0);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setDiscount(0);
      return;
    }

    const { data, error } = await supabase
      .from("promo_codes")
      .select("discount_percent")
      .eq("code", promoCode)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      toast.error("Промокод не найден");
      setDiscount(0);
      return;
    }

    setDiscount(data.discount_percent);
    toast.success(`Применена скидка ${data.discount_percent}%`);
  };

  const calculateFinalPrice = (basePrice: number) => {
    return Math.round(basePrice * (1 - discount / 100));
  };

  const handlePayment = async () => {
    if (!selectedPlan) {
      toast.error("Выберите тариф");
      return;
    }

    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    const finalPrice = calculateFinalPrice(plan.price);

    // TODO: Integrate with YooKassa
    toast.info("Интеграция с ЮКасса в разработке");
    
    // For now, simulate successful payment
    // await updateSubscription(plan.months);
  };

  const updateSubscription = async (months: number) => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const { error } = await supabase
      .from("profiles")
      .update({ subscription_end_date: endDate.toISOString() })
      .eq("id", profile.id);

    if (error) {
      toast.error("Ошибка обновления подписки");
      return;
    }

    toast.success("Подписка успешно оформлена!");
    loadProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Загрузка...</div>
      </div>
    );
  }

  const isActive = daysLeft !== null && daysLeft > 0;
  const isTrial = !profile?.subscription_end_date && profile?.trial_end_date;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <h1 className="text-3xl font-bold mb-2">Мой тариф</h1>
        
        {isActive && (
          <Card className="p-6 mb-6 bg-success/10 border-success">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-success" />
              <h2 className="text-xl font-semibold">
                {isTrial ? "Пробный период активен" : "Подписка активна"}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {isTrial 
                ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} до окончания бесплатного тарифа`
                : `Подписка активна до ${format(new Date(profile.subscription_end_date), "d MMMM yyyy", { locale: ru })}`
              }
            </p>
          </Card>
        )}

        <h2 className="text-2xl font-bold mb-4">Выберите тариф</h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {PLANS.map((plan) => {
            const finalPrice = calculateFinalPrice(plan.price);
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`p-6 cursor-pointer transition-all ${
                  isSelected
                    ? "border-telegram bg-telegram/5 ring-2 ring-telegram"
                    : "hover:border-telegram/50"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  {discount > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground line-through">
                        {plan.price} ₽
                      </p>
                      <p className="text-3xl font-bold text-telegram">
                        {finalPrice} ₽
                      </p>
                      <p className="text-sm text-success">
                        Скидка {discount}%
                      </p>
                    </>
                  ) : (
                    <p className="text-3xl font-bold">{plan.price} ₽</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  ~{Math.round(finalPrice / plan.months)} ₽/месяц
                </p>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-3">Промокод</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Введите промокод"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  validatePromoCode();
                }
              }}
            />
            <Button onClick={validatePromoCode} variant="outline">
              Применить
            </Button>
          </div>
          {discount > 0 && (
            <p className="text-sm text-success mt-2">
              ✓ Промокод применен: скидка {discount}%
            </p>
          )}
        </Card>

        <Button
          onClick={handlePayment}
          disabled={!selectedPlan}
          className="w-full h-12 bg-telegram hover:bg-telegram/90 text-lg font-semibold"
        >
          Оплатить
        </Button>
      </div>
    </div>
  );
}