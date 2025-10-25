import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, Zap, Bell, Users, Check } from "lucide-react";
import logo from "@/assets/logo.png";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import bookingMockup from "@/assets/booking-mockup.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "LookTime - Онлайн запись для вашего бизнеса";
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LookTime" className="w-10 h-10" loading="eager" decoding="async" />
            <h2 className="text-2xl font-bold text-telegram">LookTime</h2>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-foreground hover:text-telegram transition-colors">
              Преимущества
            </button>
            <button onClick={() => scrollToSection('for-whom')} className="text-foreground hover:text-telegram transition-colors">
              Для кого
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-foreground hover:text-telegram transition-colors">
              Цены
            </button>
          </nav>

          <Button
            variant="outline"
            onClick={() => navigate('/auth')}
            className="border-telegram text-telegram hover:bg-telegram hover:text-white"
          >
            Войти
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-telegram/10 mb-6">
            <Calendar className="w-10 h-10 text-telegram" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-telegram to-telegram/70 bg-clip-text text-transparent">
            LookTime
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Простой способ принимать онлайн-записи от ваших клиентов. 
            Получайте уведомления в Telegram и управляйте своим расписанием.
          </p>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8"
            >
              Попробуйте бесплатно
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Screenshots Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Просто и удобно
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Для владельцев и клиентов
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Owner Demo */}
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-[540px] bg-gradient-to-br from-foreground/5 to-foreground/10 rounded-[2.5rem] border-8 border-foreground/20 shadow-2xl p-3">
                <div className="w-full h-full bg-background rounded-[1.5rem] overflow-hidden">
                  <img 
                    src={dashboardMockup} 
                    alt="Личный кабинет владельца" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <p className="mt-6 text-lg font-semibold">Личный кабинет владельца</p>
            </div>

            {/* Client Demo */}
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-[540px] bg-gradient-to-br from-foreground/5 to-foreground/10 rounded-[2.5rem] border-8 border-foreground/20 shadow-2xl p-3">
                <div className="w-full h-full bg-background rounded-[1.5rem] overflow-hidden">
                  <img 
                    src={bookingMockup} 
                    alt="Страница записи для клиента" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <p className="mt-6 text-lg font-semibold">Страница записи для клиента</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 scroll-mt-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Преимущества
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
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
            },
            {
              icon: Bell,
              title: 'Уведомления в Telegram',
              description: 'Рассылки и уведомления клиентам прямо в Telegram'
            }
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card p-8 rounded-2xl border border-border"
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

      {/* For Whom Section */}
      <section id="for-whom" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Для кого
          </h2>
          <div className="bg-card p-8 rounded-2xl border border-border">
            <Users className="w-16 h-16 text-telegram mx-auto mb-6" />
            <h3 className="text-2xl font-semibold mb-4">
              Для частных специалистов и их клиентов
            </h3>
            <p className="text-lg text-muted-foreground mb-4">
              Максимально простой, но удобный функционал
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-telegram hover:bg-telegram/90 mt-4"
            >
              Попробуйте сами
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Цены
          </h2>
          <div className="bg-gradient-to-br from-telegram/10 to-telegram/5 p-8 md:p-12 rounded-3xl border border-telegram/20">
            <div className="mb-6">
              <p className="text-lg text-muted-foreground mb-2">Первые</p>
              <p className="text-5xl md:text-6xl font-bold text-telegram mb-2">30 дней</p>
              <p className="text-2xl font-semibold">БЕСПЛАТНО</p>
            </div>
            
            <div className="my-8 h-px bg-border"></div>
            
            <div className="mb-8">
              <p className="text-lg text-muted-foreground mb-2">Далее всего</p>
              <p className="text-4xl md:text-5xl font-bold mb-4">
                399 ₽<span className="text-xl text-muted-foreground">/месяц</span>
              </p>
            </div>

            <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
              {[
                'Ссылка для клиентов',
                'Личный кабинет',
                'Уведомления клиентам в Telegram',
                'Календарь записей',
                'Управление услугами',
                'И многое другое'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-telegram flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/auth?mode=signup')}
              className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8"
            >
              Начать бесплатно
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-telegram/10 to-telegram/5 rounded-3xl p-12 border border-telegram/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Готовы начать?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Присоединяйтесь к мастерам, которые уже используют LookTime
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/auth?mode=signup')}
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
