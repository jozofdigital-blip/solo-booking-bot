import { useState, useEffect, useRef } from "react";
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
  const paymentButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadProfile();
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast.success('Платеж успешно обработан! Подписка будет активирована в течение минуты.');
      // Clear URL parameter
      window.history.replaceState({}, '', '/subscription');
    }
  };

  useEffect(() => {
    if (selectedPlan && paymentButtonRef.current) {
      paymentButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (discount > 0 && paymentButtonRef.current) {
      paymentButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [discount]);

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

    setLoading(true);
    try {
      // Create payment via YooKassa
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          planId: plan.id,
          amount: finalPrice,
          description: `Подписка LookTime - ${plan.name}`,
          profileId: profile.id,
          months: plan.months
        }
      });

      console.log('Payment response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Check if data has confirmationUrl directly or nested
      const confirmationUrl = data?.confirmationUrl || data?.data?.confirmationUrl;
      
      console.log('Confirmation URL:', confirmationUrl);

      if (confirmationUrl) {
        // Open YooKassa in a new tab to avoid iframe/navigation blocking
        const win = window.open(confirmationUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Fallback: same-tab navigation
          window.location.href = confirmationUrl;
        } else {
          toast.success('Окно оплаты ЮКассы открыто в новой вкладке');
        }
      } else {
        console.error('Full response data:', JSON.stringify(data, null, 2));
        throw new Error('No confirmation URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(`Ошибка при создании платежа: ${error.message || 'Неизвестная ошибка'}`);
      setLoading(false);
    }
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Мой тариф</h1>
          <p className="text-sm text-muted-foreground">Выберите подходящий план</p>
        </div>
        
        {isActive && (
          <Card className="p-4 mb-6 bg-success/10 border-success">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-success" />
              <p className="font-medium text-sm">
                {isTrial ? "Пробный период активен" : "Подписка активна"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              {isTrial 
                ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} до окончания`
                : `До ${format(new Date(profile.subscription_end_date), "d MMMM yyyy", { locale: ru })}`
              }
            </p>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-3 mb-5">
          {PLANS.map((plan, index) => {
            const finalPrice = calculateFinalPrice(plan.price);
            const isSelected = selectedPlan === plan.id;
            const isPopular = index === 1; // 6 months is popular

            return (
              <Card
                key={plan.id}
                className={`relative p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-telegram bg-telegram/5 ring-2 ring-telegram"
                    : "hover:border-telegram/30 hover:shadow-md"
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {isPopular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="bg-telegram text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Популярный
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h3 className="font-semibold mb-3">{plan.name}</h3>
                  
                  <div className="mb-3">
                    {discount > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground line-through mb-1">
                          {plan.price} ₽
                        </p>
                        <p className="text-2xl font-bold text-telegram">
                          {finalPrice} ₽
                        </p>
                        <p className="text-xs text-success mt-1">
                          −{discount}%
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold">{plan.price} ₽</p>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {Math.round(finalPrice / plan.months)} ₽/мес
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-4 mb-5">
          <label className="text-sm font-medium mb-2 block">У вас есть промокод?</label>
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
              className="h-9"
            />
            <Button onClick={validatePromoCode} variant="outline" size="sm">
              Применить
            </Button>
          </div>
          {discount > 0 && (
            <p className="text-xs text-success mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Промокод применен: скидка {discount}%
            </p>
          )}
        </Card>

        <Button
          ref={paymentButtonRef}
          onClick={handlePayment}
          disabled={!selectedPlan || loading}
          className="w-full bg-telegram hover:bg-telegram/90 font-semibold"
        >
          {loading ? 'Создание платежа...' : 'Оплатить'}
          {!loading && selectedPlan && ` ${calculateFinalPrice(PLANS.find(p => p.id === selectedPlan)?.price || 0)} ₽`}
        </Button>
      </div>
    </div>
  );
}