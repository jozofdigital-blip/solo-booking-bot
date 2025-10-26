import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, Zap, Bell, Users, Check, X, Sparkles, Send } from "lucide-react";
import logo from "@/assets/logo.png";
import ownerDashboard3Day from "@/assets/owner-dashboard-3day.jpg";
import ownerDashboardWeek from "@/assets/owner-dashboard-week.jpg";
import ownerAddService from "@/assets/owner-add-service.jpg";
import ownerCreateAppointment from "@/assets/owner-create-appointment.jpg";
import ownerClientsList from "@/assets/owner-clients-list.jpg";
import bookingMockup from "@/assets/booking-mockup.png";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const Index = () => {
  const [activeScreen, setActiveScreen] = useState<'owner' | 'client'>('owner');
  const [ownerSlide, setOwnerSlide] = useState(0);
  const [clientSlide, setClientSlide] = useState(0);
  const TELEGRAM_CHANNEL = "https://t.me/looktime_online";

  const ownerSlides = [
    { src: ownerDashboard3Day, alt: "Dashboard 3 дня" },
    { src: ownerDashboardWeek, alt: "Dashboard неделя" },
    { src: ownerAddService, alt: "Добавить услугу" },
    { src: ownerCreateAppointment, alt: "Создать запись" },
    { src: ownerClientsList, alt: "Список клиентов" },
  ];

  const clientSlides = [
    { src: bookingMockup, alt: "Выбор услуги" },
    { src: dashboardMockup, alt: "Выбор времени" },
  ];

  useEffect(() => {
    document.title = "LookTime - Сервис онлайн-записи в Telegram";
  }, []);

  useEffect(() => {
    const screenInterval = setInterval(() => {
      setActiveScreen(prev => prev === 'owner' ? 'client' : 'owner');
    }, 8000);

    const ownerInterval = setInterval(() => {
      setOwnerSlide(prev => (prev + 1) % ownerSlides.length);
    }, 2000);

    const clientInterval = setInterval(() => {
      setClientSlide(prev => (prev + 1) % clientSlides.length);
    }, 2000);

    return () => {
      clearInterval(screenInterval);
      clearInterval(ownerInterval);
      clearInterval(clientInterval);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LookTime" className="w-10 h-10" loading="eager" decoding="async" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-telegram to-telegram/70 bg-clip-text text-transparent">LookTime</h2>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-foreground hover:text-telegram transition-colors font-medium">
              Преимущества
            </button>
            <button onClick={() => scrollToSection('for-whom')} className="text-foreground hover:text-telegram transition-colors font-medium">
              Для кого
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-foreground hover:text-telegram transition-colors font-medium">
              Цены
            </button>
          </nav>

          <Button
            onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
            className="bg-telegram hover:bg-telegram/90 gap-2"
          >
            <Send className="w-4 h-4" />
            Telegram
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-telegram/10 border border-telegram/20 mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-telegram" />
            <span className="text-sm font-medium text-telegram">Онлайн-запись прямо в Telegram</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Сервис онлайн-записи <br />
            <span className="bg-gradient-to-r from-telegram to-telegram/60 bg-clip-text text-transparent">
              прямо в Telegram
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Увеличьте количество записей, принимая заявки <span className="font-semibold text-foreground">24/7</span> и НЕ теряйте клиентов с помощью автоматических напоминаний о визитах.
          </p>

          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
              className="bg-telegram hover:bg-telegram/90 text-lg h-16 px-10 shadow-lg hover:shadow-xl transition-all gap-2 group"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Попробовать бесплатно
            </Button>
            <p className="text-sm text-muted-foreground">Бесплатный период 10 дней</p>
          </div>
        </div>
      </section>

      {/* Demo Screenshots Section with Animation */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative mx-auto" style={{ width: '280px', height: '580px' }}>
            {/* Phone Frame */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black rounded-[3rem] shadow-2xl p-2">
              <div className="relative w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                {/* Owner Screen */}
                <div 
                  className={`absolute inset-0 transition-all duration-700 ${
                    activeScreen === 'owner' 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 -translate-x-full'
                  }`}
                >
                  {ownerSlides.map((slide, index) => (
                    <img 
                      key={index}
                      src={slide.src} 
                      alt={slide.alt}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        ownerSlide === index ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="eager"
                      decoding="async"
                    />
                  ))}
                </div>

                {/* Client Screen */}
                <div 
                  className={`absolute inset-0 transition-all duration-700 ${
                    activeScreen === 'client' 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-full'
                  }`}
                >
                  {clientSlides.map((slide, index) => (
                    <img 
                      key={index}
                      src={slide.src} 
                      alt={slide.alt}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        clientSlide === index ? 'opacity-100' : 'opacity-0'
                      }`}
                      loading="eager"
                      decoding="async"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={() => setActiveScreen('owner')}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeScreen === 'owner'
                    ? 'bg-telegram text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Владелец
              </button>
              <button
                onClick={() => setActiveScreen('client')}
                className={`px-4 py-2 rounded-full transition-all ${
                  activeScreen === 'client'
                    ? 'bg-telegram text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Клиент
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Если вы искали сервис для ведения <br className="hidden md:block" />
            и онлайн-записи клиентов, но:
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[
              'Они неоправданно дорогие',
              'У них множество функций, которые вам не нужны',
              'У них неудобный интерфейс',
              'Техподдержка отвечает раз в год'
            ].map((problem, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-6 bg-destructive/5 border border-destructive/20 rounded-2xl"
              >
                <X className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-lg">{problem}</span>
              </div>
            ))}
          </div>

          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold mb-8">
              Тогда попробуйте <span className="text-telegram">LookTime:</span>
            </h3>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Быстрый старт - через 2 минуты уже можно принимать клиентов' },
              { icon: Calendar, text: 'Простой и максимально удобный календарь' },
              { icon: Share2, text: 'Ссылка для клиентов с онлайн-записью' },
              { icon: Check, text: 'Честные тарифы без накручивания цен' },
              { icon: Bell, text: 'Уведомления вам и клиентам прямо в Телеграм' },
              { icon: Users, text: 'Вы и ваши клиенты быстро разберетесь в нем' },
              { icon: Sparkles, text: 'Разработчик прислушивается к вашему мнению' }
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={index} 
                  className="flex items-start gap-4 p-6 bg-card border border-border rounded-2xl hover:border-telegram/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-telegram/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-telegram" />
                  </div>
                  <span className="text-lg pt-2.5">{benefit.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Telegram Channel CTA */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-telegram/10 to-telegram/5 rounded-3xl p-8 md:p-12 border border-telegram/20 text-center">
            <Send className="w-16 h-16 text-telegram mx-auto mb-6" />
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Вступайте в телеграм канал
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Мы максимально подробно описали весь функционал. Удобно смотреть видео по 20-30 секунд.
            </p>
            <Button
              size="lg"
              onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
              className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8 gap-2"
            >
              <Send className="w-5 h-5" />
              Перейти в канал
            </Button>
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
      <section id="for-whom" className="container mx-auto px-4 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Для кого
          </h2>
          <div className="bg-gradient-to-br from-telegram/5 to-background p-8 md:p-12 rounded-3xl border border-telegram/20">
            <Users className="w-20 h-20 text-telegram mx-auto mb-6" />
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center">
              Любые частные исполнители
            </h3>
            <p className="text-lg md:text-xl text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              У которых есть почасовая запись клиентов. Долго перечислять :)
            </p>
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
                className="bg-telegram hover:bg-telegram/90 text-lg h-14 px-8 gap-2"
              >
                <Send className="w-5 h-5" />
                Узнать больше
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Цены
          </h2>
          <p className="text-lg text-center text-muted-foreground mb-12">
            Честные тарифы без скрытых платежей
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { period: '3 месяца', price: 750, perMonth: 250 },
              { period: '6 месяцев', price: 1300, perMonth: 217, popular: true },
              { period: '1 год', price: 2200, perMonth: 183, savings: 'Выгодно!' }
            ].map((plan, index) => (
              <div 
                key={index}
                className={`relative p-8 rounded-3xl border-2 transition-all hover:scale-105 ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-telegram/10 to-telegram/5 border-telegram shadow-lg' 
                    : 'bg-card border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-telegram text-white text-sm font-semibold rounded-full">
                    Популярный
                  </div>
                )}
                {plan.savings && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-success text-white text-sm font-semibold rounded-full">
                    {plan.savings}
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-2 text-center">{plan.period}</h3>
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-telegram mb-1">{plan.price} ₽</p>
                  <p className="text-sm text-muted-foreground">≈ {plan.perMonth} ₽/месяц</p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    'Онлайн-запись 24/7',
                    'Календарь записей',
                    'Уведомления в Telegram',
                    'Управление услугами',
                    'База клиентов'
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-telegram flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
                  className={plan.popular ? 'w-full bg-telegram hover:bg-telegram/90' : 'w-full'}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  Выбрать
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center bg-gradient-to-br from-warning/10 to-warning/5 p-8 rounded-3xl border border-warning/20">
            <Sparkles className="w-12 h-12 text-warning mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3">
              Получите промокод на дополнительную скидку
            </h3>
            <p className="text-muted-foreground mb-6">
              В нашем телеграм-канале
            </p>
            <Button
              size="lg"
              onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
              className="bg-telegram hover:bg-telegram/90 gap-2"
            >
              <Send className="w-5 h-5" />
              Получить промокод
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-telegram to-telegram/80 rounded-3xl p-12 md:p-16 border border-telegram/20 shadow-2xl text-white">
          <Calendar className="w-20 h-20 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Готовы начать?
          </h2>
          <p className="text-lg mb-8 text-white/90">
            Присоединяйтесь к специалистам, которые уже используют LookTime
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.open(TELEGRAM_CHANNEL, '_blank')}
              className="bg-white text-telegram hover:bg-white/90 text-lg h-14 px-8 gap-2 shadow-lg"
            >
              <Send className="w-5 h-5" />
              Перейти в канал
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/80">
            Бесплатный пробный период 10 дней
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="text-center text-muted-foreground">
          <p>© 2025 LookTime. Сервис онлайн-записи в Telegram</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
