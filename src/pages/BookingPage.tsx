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
import { Clock } from "lucide-react";
import { hasEnoughContinuousTime } from "@/lib/utils";

export default function BookingPage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);

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

      // Load working hours
      const { data: workingData } = await supabase
        .from('working_hours')
        .select('*')
        .eq('profile_id', profileData.id);
      
      setWorkingHours(workingData || []);
    } catch (error) {
      toast.error('Профиль не найден');
    }
  };

  const loadAppointments = async (date: Date) => {
    if (!profile) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('appointments')
      .select('*, services(duration_minutes)')
      .eq('profile_id', profile.id)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    const appointmentsWithDuration = data?.map(apt => ({
      ...apt,
      duration_minutes: (apt.services as any)?.duration_minutes || 60
    })) || [];

    setAppointments(appointmentsWithDuration);
  };

  useEffect(() => {
    if (selectedDate) {
      loadAppointments(selectedDate);
    }
  }, [selectedDate, profile]);

  const getAvailableTimeSlots = () => {
    if (!selectedDate || !selectedService) return [];

    const dayOfWeek = selectedDate.getDay();
    const workingDay = workingHours.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
    
    if (!workingDay) return [];

    const selectedServiceData = services.find(s => s.id === selectedService);
    const serviceDuration = selectedServiceData?.duration_minutes || 60;

    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    const endMinute = parseInt(workingDay.end_time.split(':')[1]);

    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // Check if slot has enough continuous time for the service
        if (hasEnoughContinuousTime(
          format(selectedDate, 'yyyy-MM-dd'),
          time,
          serviceDuration,
          appointments,
          workingDay.end_time.substring(0, 5)
        )) {
          slots.push(time);
        }
      }
    }

    return slots;
  };

  const availableTimeSlots = getAvailableTimeSlots();

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
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          status: 'pending'
        });

      if (error) throw error;

      // Send telegram notification if chat_id is configured
      if (profile?.telegram_chat_id) {
        try {
          const serviceData = services.find(s => s.id === selectedService);
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              chatId: profile.telegram_chat_id,
              clientName: clientName,
              serviceName: serviceData?.name || '',
              date: format(selectedDate, 'dd.MM.yyyy', { locale: ru }),
              time: selectedTime,
              phone: clientPhone,
            },
          });
        } catch (notificationError) {
          console.error('Failed to send telegram notification:', notificationError);
          // Don't fail the booking if notification fails
        }
      }

      toast.success('Запись успешно создана!');
      
      // Reset form
      setSelectedService(null);
      setSelectedDate(undefined);
      setSelectedTime('');
      setClientName('');
      setClientPhone('');
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
            <h1 className="text-xl font-bold mb-2">{profile.business_name}</h1>
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
                    {availableTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimeSlots.map((time) => (
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
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        На выбранную дату нет доступных слотов для этой услуги
                      </p>
                    )}
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
