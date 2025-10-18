import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Booking Bot - Онлайн запись для вашего бизнеса";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-telegram-light via-background to-telegram-light/30">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-telegram/10 mb-6 animate-pulse">
            <Calendar className="w-10 h-10 text-telegram" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-telegram to-telegram/70 bg-clip-text text-transparent">
            Booking Bot
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Простой способ принимать онлайн-записи от ваших клиентов. 
            Получайте уведомления в Telegram и управляйте своим расписанием.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8"
            >
              Начать бесплатно
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg h-14 px-8"
            >
              Войти
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: Zap,
              title: 'Быстрый старт',
              description: 'Создайте профиль и получите уникальную ссылку за 2 минуты'
            },
            {
              icon: Share2,
              title: 'Удобно делиться',
              description: 'Отправляйте ссылку клиентам или размещайте в соцсетях'
            },
            {
              icon: Clock,
              title: 'Управление временем',
              description: 'Просматривайте все записи в удобном календаре'
            }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card p-8 rounded-2xl border border-border hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-telegram/10 mb-4">
                  <Icon className="w-7 h-7 text-telegram" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-telegram/10 to-telegram/5 rounded-3xl p-12 border border-telegram/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Готовы начать?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Присоединяйтесь к мастерам, которые уже используют Booking Bot
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8"
          >
            Создать аккаунт
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
