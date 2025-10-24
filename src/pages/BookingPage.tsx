import React, { useEffect, useState, useRef } from "react";
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
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";

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
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [botUsername, setBotUsername] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [clientHasTelegram, setClientHasTelegram] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
    loadBotUsername();
    loadClientDataFromLocalStorage();
  }, [slug]);

  useEffect(() => {
    if (selectedService && calendarRef.current) {
      calendarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedDate && timeRef.current) {
      timeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && contactRef.current) {
      contactRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedTime]);

  const loadClientDataFromLocalStorage = () => {
    const savedData = localStorage.getItem('client_booking_data');
    if (savedData) {
      try {
        const { name, phone } = JSON.parse(savedData);
        setClientName(name || '');
        setClientPhone(phone || '');
      } catch (error) {
        console.error('Error loading client data:', error);
      }
    }
  };

  const saveClientDataToLocalStorage = (name: string, phone: string) => {
    localStorage.setItem('client_booking_data', JSON.stringify({ name, phone }));
  };

  const loadBotUsername = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-bot-info');
      if (data?.username) {
        setBotUsername(data.username);
      }
    } catch (error) {
      console.error('Error loading bot info:', error);
    }
  };

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
      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          service_id: selectedService,
          profile_id: profile.id,
          client_name: clientName,
          client_phone: clientPhone,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Save client data to localStorage
      saveClientDataToLocalStorage(clientName, clientPhone);

      // Save or update client in the clients table
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone)
        .eq('profile_id', profile.id)
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        // Update last_visit for existing client
        await supabase
          .from('clients')
          .update({ last_visit: new Date().toISOString(), name: clientName })
          .eq('id', existingClient.id);
        clientId = existingClient.id;
      } else {
        // Create new client
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            profile_id: profile.id,
            name: clientName,
            phone: clientPhone,
            last_visit: new Date().toISOString()
          })
          .select('id')
          .single();
        clientId = newClient!.id;
      }

      // Send telegram notification to owner if chat_id is configured
      if (profile?.telegram_chat_id && newAppointment?.id) {
        try {
          const serviceData = services.find(s => s.id === selectedService);
          const dashboardUrl = 'https://looktime.pro/dashboard';
          
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              chatId: profile.telegram_chat_id,
              clientName: clientName,
              serviceName: serviceData?.name || '',
              date: format(selectedDate, 'dd.MM.yyyy', { locale: ru }),
              time: selectedTime,
              phone: clientPhone,
              appointmentId: newAppointment.id,
              appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
              type: 'new',
              bookingUrl: dashboardUrl,
            },
          });
        } catch (notificationError) {
          console.error('Failed to send telegram notification:', notificationError);
        }
      }

      // Check if client has telegram and send confirmation
      const { data: clientData } = await supabase
        .from('clients')
        .select('telegram_chat_id')
        .eq('id', clientId)
        .maybeSingle();

      const hasTelegram = !!clientData?.telegram_chat_id;
      setClientHasTelegram(hasTelegram);

      if (hasTelegram) {
        try {
          const serviceData = services.find(s => s.id === selectedService);
          await supabase.functions.invoke('send-client-notification', {
            body: {
              chatId: clientData.telegram_chat_id,
              type: 'confirmation',
              clientName: clientName,
              serviceName: serviceData?.name || '',
              date: format(selectedDate, 'dd MMMM yyyy', { locale: ru }),
              time: selectedTime,
              businessName: profile.business_name,
              address: profile.address,
              myAppointmentsUrl: 'https://looktime.pro/my-appointments',
            },
          });
        } catch (notificationError) {
          console.error('Failed to send client notification:', notificationError);
        }
      }

      // Reload appointments to update available slots
      await loadAppointments(selectedDate);
      
      toast.success('Запись успешно создана!');
      
      // Open success dialog with client ID
      setClientId(clientId);
      setSuccessDialogOpen(true);
      
      // Reset form but keep date to show updated slots
      setSelectedService(null);
      setSelectedTime('');
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="p-6 mb-6 bg-telegram/5 border-telegram/20">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              {profile.business_name}
            </h1>
            {profile.description && (
              <p className="text-muted-foreground text-sm">{profile.description}</p>
            )}
          </div>
        </Card>

        {/* Services Selection */}
        <Card className="p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">Выберите услугу</h2>
          <div className="space-y-2">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedService === service.id
                    ? 'border-telegram bg-telegram/5'
                    : 'border-border hover:border-telegram/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium mb-1">{service.name}</div>
                    {service.description && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {service.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-semibold text-telegram">{service.price} ₽</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {service.duration_minutes} мин
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Date Selection */}
        {selectedService && (
          <Card className="p-5 mb-6" ref={calendarRef}>
            <h2 className="text-lg font-semibold mb-3">Выберите дату</h2>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ru}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className="rounded-md border w-full"
            />
          </Card>
        )}

        {/* Time Selection */}
        {selectedDate && (
          <Card className="p-5 mb-6" ref={timeRef}>
            <h2 className="text-lg font-semibold mb-3">Выберите время</h2>
            {availableTimeSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {availableTimeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => setSelectedTime(time)}
                    className={selectedTime === time ? "bg-telegram hover:bg-telegram/90" : ""}
                    size="sm"
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
          </Card>
        )}

        {/* Client Info */}
        {selectedService && selectedDate && selectedTime && (
          <Card className="p-5 mb-6" ref={contactRef}>
            <h2 className="text-lg font-semibold mb-3">Ваши контактные данные</h2>
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
                onChange={(e) => {
                  let value = e.target.value;
                  // Remove all non-digits
                  value = value.replace(/\D/g, '');
                  // Add +7 prefix if not present
                  if (!value.startsWith('7') && value.length > 0) {
                    value = '7' + value;
                  }
                  if (value.length > 0) {
                    value = '+' + value;
                  }
                  // Limit to +7 + 10 digits
                  if (value.length > 12) {
                    value = value.substring(0, 12);
                  }
                  setClientPhone(value);
                }}
                required
              />

              <div className="border-t pt-3 mt-3">
                <div className="bg-telegram/5 p-3 rounded-lg mb-3 border border-telegram/20">
                  <h3 className="font-semibold mb-2 text-sm">Детали записи:</h3>
                  <div className="space-y-1">
                    <p className="text-sm"><strong>Услуга:</strong> {selectedServiceData?.name}</p>
                    <p className="text-sm"><strong>Дата:</strong> {format(selectedDate, 'd MMMM yyyy', { locale: ru })}</p>
                    <p className="text-sm"><strong>Время:</strong> {selectedTime}</p>
                    <p className="text-sm"><strong>Цена:</strong> {selectedServiceData?.price} ₽</p>
                  </div>
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={loading}
                  className="w-full h-11 bg-telegram hover:bg-telegram/90 font-semibold"
                >
                  {loading ? 'Отправка...' : 'Записаться'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <BookingSuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        clientId={clientId}
        botUsername={botUsername}
        hasTelegram={clientHasTelegram}
      />
    </div>
  );
}
