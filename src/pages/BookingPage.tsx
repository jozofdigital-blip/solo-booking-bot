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
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { Clock } from "lucide-react";
import { hasEnoughContinuousTime, hasAppointmentOverlap } from "@/lib/utils";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";

export default function BookingPage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+7');
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
      
      // Автоматически выбрать текущую дату если она еще не выбрана
      if (!selectedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
      }
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
        setClientPhone(phone || '+7');
      } catch (error) {
        // Ignore parsing errors
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
      // Silent fail - bot username is optional
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

      // Параллельная загрузка услуг и рабочих часов
      const [servicesResult, workingHoursResult] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('profile_id', profileData.id)
          .eq('is_active', true),
        supabase
          .from('working_hours')
          .select('*')
          .eq('profile_id', profileData.id)
      ]);

      setServices(servicesResult.data || []);
      setWorkingHours(workingHoursResult.data || []);
    } catch (error) {
      toast.error('Профиль не найден');
    }
  };

  const loadAppointments = async (date: Date) => {
    if (!profile) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase.functions.invoke('get-busy-slots', {
        body: { profileId: profile.id, date: dateStr },
      });

      if (error) return;

      const raw = (data as any)?.slots ?? [];
      const appointmentsWithDuration = raw.map((apt: any) => ({
        appointment_date: dateStr,
        appointment_time: apt.appointment_time,
        service_id: apt.service_id,
        status: apt.status,
        duration_minutes: (services.find(s => s.id === apt.service_id)?.duration_minutes) || 60,
      }));

      setAppointments(appointmentsWithDuration);
    } catch (err) {
      // Silent fail - slots remain empty
    }
  };

  useEffect(() => {
    if (selectedDate && profile) {
      loadAppointments(selectedDate);

      // Subscribe to real-time updates for this profile's appointments
      const channel = supabase
        .channel(`appointments_${profile.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `profile_id=eq.${profile.id}`
          },
          (payload) => {
            // Force reload appointments immediately and recalculate slots
            loadAppointments(selectedDate).then(() => {
              setSelectedTime(''); // Reset selected time if slot becomes unavailable
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedDate, profile]);

  const getAvailableTimeSlots = () => {
    if (!selectedDate || !selectedService) {
      return [];
    }

    try {
      const dayOfWeek = selectedDate.getDay();
      
      const workingDay = workingHours.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
      
      if (!workingDay) return [];

      const selectedServiceData = services.find(s => s.id === selectedService);
      const serviceDuration = selectedServiceData?.duration_minutes || 60;

      const startHour = parseInt(workingDay.start_time.split(':')[0]);
      const endHour = parseInt(workingDay.end_time.split(':')[0]);
      const endMinute = parseInt(workingDay.end_time.split(':')[1]);

      // Get current time in master's timezone with fallback
      const profileTimezone = profile?.timezone || 'Europe/Moscow';
      const now = new Date();
      let nowInMasterTz: Date;
      let selectedDateInMasterTz: Date;
      
      try {
        nowInMasterTz = toZonedTime(now, profileTimezone);
        selectedDateInMasterTz = toZonedTime(selectedDate, profileTimezone);
      } catch (tzError) {
        // Fallback to local time if timezone conversion fails
        nowInMasterTz = now;
        selectedDateInMasterTz = selectedDate;
      }
      
      const currentHour = nowInMasterTz.getHours();
      const currentMinute = nowInMasterTz.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // Check if selected date is today in master's timezone
      const isToday = format(selectedDateInMasterTz, 'yyyy-MM-dd') === format(nowInMasterTz, 'yyyy-MM-dd');

      const slots: string[] = [];
      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const slotTimeInMinutes = hour * 60 + minute;
          
          // Skip past time slots if it's today
          if (isToday && slotTimeInMinutes <= currentTimeInMinutes) {
            continue;
          }
          
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
    } catch (error) {
      return [];
    }
  };

  const availableTimeSlots = getAvailableTimeSlots();

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    // Validate phone format
    if (clientPhone.length < 12) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    // Validate name
    if (clientName.trim().length < 2) {
      toast.error('Введите корректное имя');
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const appointmentId = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          id: appointmentId,
          service_id: selectedService,
          profile_id: profile.id,
          client_name: clientName,
          client_phone: clientPhone,
          appointment_date: dateStr,
          appointment_time: selectedTime,
          status: 'pending',
          notification_viewed: false
        });

      if (insertError) throw insertError;

      // Save client data to localStorage
      saveClientDataToLocalStorage(clientName, clientPhone);

      // Try to create client record (may fail if duplicate, which is fine)
      const clientId = crypto.randomUUID();
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          id: clientId,
          profile_id: profile.id,
          name: clientName,
          phone: clientPhone,
          last_visit: new Date().toISOString()
        });

      // Ignore errors - client may already exist or be created by another session

      // Send telegram notification to owner if chat_id is configured
      if (profile?.telegram_chat_id) {
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
              appointmentId: appointmentId,
              appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
              type: 'new',
              bookingUrl: dashboardUrl,
            },
          });
        } catch (notificationError) {
          // Silent fail - notification is not critical
        }
      }

      // Check if client has Telegram by querying clients table directly
      const { data: clientWithTelegram } = await supabase
        .from('clients')
        .select('telegram_chat_id')
        .eq('phone', clientPhone)
        .eq('profile_id', profile.id)
        .not('telegram_chat_id', 'is', null)
        .maybeSingle();
      
      setClientHasTelegram(!!clientWithTelegram?.telegram_chat_id);

      // Force immediate reload of appointments to update available slots for all users
      await loadAppointments(selectedDate);
      
      toast.success('Запись успешно создана!');
      
      // Open success dialog with client ID
      setClientId(clientId);
      setSuccessDialogOpen(true);
      
      // Reset form but keep date to show updated slots
      setSelectedService(null);
      setSelectedTime('');
    } catch (error: any) {
      // Handle specific overlap error from database trigger
      if (error?.message?.includes('OVERLAP_TIME_SLOT')) {
        toast.error('Это время уже занято. Выберите другое время.');
        await loadAppointments(selectedDate);
      } else {
        toast.error(error?.message || 'Ошибка при создании записи');
      }
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Modern Compact Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.business_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                {profile.business_name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-bold">{profile.business_name}</h1>
              {profile.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{profile.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Services Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl font-bold">Выберите услугу</h2>
          </div>
          
          <div className="grid gap-3">
            {services.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20'
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>
                  )}
                  
                  <div className="relative flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {service.description}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{service.duration_minutes} мин</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xl font-bold text-primary">
                        {service.price} ₽
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Selection */}
        {selectedService && (
          <div className="space-y-3 animate-fade-in" ref={calendarRef}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Выберите дату</h2>
            </div>
            
            <Card className="p-4 border-2 shadow-sm hover:shadow-md transition-shadow">
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
                className="rounded-lg w-full pointer-events-auto"
              />
            </Card>
          </div>
        )}

        {/* Time Selection */}
        {selectedDate && selectedService && (
          <div className="space-y-3 animate-fade-in" ref={timeRef}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Время</h2>
            </div>
            
            <Card className="p-4 border-2 shadow-sm">
              {workingHours.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Рабочие часы не настроены
                </p>
              ) : availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {availableTimeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`relative py-2.5 px-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                            : 'bg-muted hover:bg-muted/80 hover:scale-105'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  На выбранную дату нет доступных слотов
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Client Info */}
        {selectedService && selectedDate && selectedTime && (
          <div className="space-y-3 animate-fade-in" ref={contactRef}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Контакты</h2>
            </div>
            
            <Card className="p-5 border-2 shadow-sm">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Ваше имя</label>
                  <Input
                    placeholder="Введите имя"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Телефон</label>
                  <Input
                    type="tel"
                    placeholder="+79998887766"
                    value={clientPhone}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/\D/g, '');
                      if (!value.startsWith('7') && value.length > 0) {
                        value = '7' + value;
                      }
                      if (value.length > 0) {
                        value = '+' + value;
                      }
                      if (value.length > 12) {
                        value = value.substring(0, 12);
                      }
                      setClientPhone(value);
                    }}
                    className="h-11"
                    required
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl mb-4 border border-primary/20">
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Детали записи
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Услуга:</span>
                        <span className="font-medium">{selectedServiceData?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Дата:</span>
                        <span className="font-medium">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Время:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Итого:</span>
                        <span className="font-bold text-lg text-primary">{selectedServiceData?.price} ₽</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-base shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-[1.02]"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Создание записи...</span>
                      </div>
                    ) : (
                      'Записаться'
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
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
