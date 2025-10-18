import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ru } from "date-fns/locale";
import { format } from "date-fns";
import { Clock, Send } from "lucide-react";

export default function BookingPage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientTelegram, setClientTelegram] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [slug]);

  const loadProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('unique_slug', slug)
        .single();

      if (error) throw error;
      setProfile(profileData);

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('profile_id', profileData.id)
        .eq('is_active', true);

      setServices(servicesData || []);
    } catch (error) {
      toast.error('Профиль не найден');
    }
  };

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          service_id: selectedService,
          profile_id: profile.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_telegram: clientTelegram || null,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Запись успешно создана!');
      
      // Reset form
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime('');
      setClientName('');
      setClientPhone('');
      setClientTelegram('');
    } catch (error: any) {
      toast.error('Ошибка при создании записи');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Загрузка...</div>
      </div>
    );
  }

  const selectedServiceData = services.find(s => s.id === selectedService);

  return (
    <div className="min-h-screen bg-gradient-to-br from-telegram-light to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{profile.business_name}</h1>
            {profile.description && (
              <p className="text-muted-foreground">{profile.description}</p>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Выберите услугу</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedService === service.id
                      ? 'border-telegram bg-telegram/5'
                      : 'border-border hover:border-telegram/50'
                  }`}
                >
                  <div className="font-medium mb-1">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {service.description}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {service.duration_minutes} мин
                    </span>
                    <span className="font-semibold text-telegram">
                      {service.price} ₽
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Date & Time Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Выберите дату и время</h2>
            
            {selectedService ? (
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ru}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border w-full"
                />

                {selectedDate && (
                  <div>
                    <h3 className="font-medium mb-3">Доступное время</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          onClick={() => setSelectedTime(time)}
                          className={selectedTime === time ? "bg-telegram hover:bg-telegram/90" : ""}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Сначала выберите услугу
              </div>
            )}
          </Card>
        </div>

        {/* Client Info */}
        {selectedService && selectedDate && selectedTime && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Ваши контактные данные</h2>
            <div className="space-y-4">
              <Input
                placeholder="Ваше имя *"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
              <Input
                placeholder="Телефон *"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
              />
              <Input
                placeholder="Telegram (опционально)"
                value={clientTelegram}
                onChange={(e) => setClientTelegram(e.target.value)}
              />

              <div className="border-t pt-4 mt-4">
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Детали записи:</h3>
                  <p className="text-sm"><strong>Услуга:</strong> {selectedServiceData?.name}</p>
                  <p className="text-sm"><strong>Дата:</strong> {format(selectedDate, 'd MMMM yyyy', { locale: ru })}</p>
                  <p className="text-sm"><strong>Время:</strong> {selectedTime}</p>
                  <p className="text-sm"><strong>Цена:</strong> {selectedServiceData?.price} ₽</p>
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={loading}
                  className="w-full h-12 bg-telegram hover:bg-telegram/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Отправка...' : 'Записаться'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
