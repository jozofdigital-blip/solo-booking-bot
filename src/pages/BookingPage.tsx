import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ru } from "date-fns/locale";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
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
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [appointmentsLoadedDate, setAppointmentsLoadedDate] = useState<string | null>(null);
  const [busyCounts, setBusyCounts] = useState<Record<string, number>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
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
  
  const fetchBusyDays = async (monthDate: Date) => {
    if (!profile) return;
    try {
      const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const { data, error } = await supabase.functions.invoke('get-busy-days', {
        body: { profileId: profile.id, startDate, endDate },
      });
      if (error) throw error;
      const counts = (data as any)?.counts || {};
      setBusyCounts(counts);
      console.log('[booking] busy days loaded', { month: monthDate.getMonth() + 1, countDays: Object.keys(counts).length });
    } catch (err) {
      console.error('[booking] busy days load error', err);
    }
  };

  const isDayBlocked = (date: Date) => {
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find((wh: any) => wh.day_of_week === dayOfWeek);
    return !workingDay?.is_working;
  };

  const isDayFull = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find((wh: any) => wh.day_of_week === dayOfWeek && wh.is_working);
    if (!workingDay) return false;
    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const startMinute = parseInt(workingDay.start_time.split(':')[1]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    const endMinute = parseInt(workingDay.end_time.split(':')[1]);
    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const totalSlots = Math.floor(totalMinutes / 30);
    const bookedSlots = busyCounts[dateStr] || 0;
    return bookedSlots >= totalSlots && totalSlots > 0;
  };

  const loadAppointments = async (date: Date, attempt: number = 1) => {
    if (!profile) return;
    setSlotsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase.functions.invoke('get-busy-slots', {
        body: { profileId: profile.id, date: dateStr },
      });
      console.log('[booking] get-busy-slots request', { profileId: profile.id, date: dateStr });

      if (error) {
        console.error('[booking] get-busy-slots error', error);
        throw error;
      }

      const raw = (data as any)?.slots ?? [];
      console.log('[booking] get-busy-slots response count', raw.length, raw);
      const appointmentsWithDuration = raw.map((apt: any) => ({
        appointment_date: dateStr,
        appointment_time: apt.appointment_time,
        service_id: apt.service_id,
        status: apt.status,
        duration_minutes: apt.services?.duration_minutes || (services.find(s => s.id === apt.service_id)?.duration_minutes) || 60,
      }));

      setAppointments(appointmentsWithDuration);
      setAppointmentsLoadedDate(dateStr);
      console.log('[booking] appointments prepared', { dateStr, count: appointmentsWithDuration.length, sample: appointmentsWithDuration.slice(0,3) });

      // If currently selected time became unavailable, reset it
      if (selectedTime && selectedService) {
        const selectedServiceDataLocal = services.find(s => s.id === selectedService);
        const dur = selectedServiceDataLocal?.duration_minutes || 60;
        const overlaps = hasAppointmentOverlap(dateStr, selectedTime, dur, appointmentsWithDuration);
        if (overlaps) {
          setSelectedTime('');
        }
      }
    } catch (err) {
      // Повторить запрос до 3 раз на случай холодного старта/сетевых сбоев
      if (attempt < 3) {
        setTimeout(() => {
          loadAppointments(date, attempt + 1);
        }, attempt * 600);
      }
    } finally {
      setSlotsLoading(false);
    }
  };
  // Load appointments only when date changes
  useEffect(() => {
    if (selectedDate && profile) {
      loadAppointments(selectedDate);
    }
  }, [selectedDate, profile]);

  // Reload slots when service changes (to recalculate available slots with correct duration)
  useEffect(() => {
    if (selectedDate && selectedService && profile && services.length > 0) {
      loadAppointments(selectedDate);
    }
  }, [selectedService]);

  // Fetch busy days when month or profile changes
  useEffect(() => {
    if (profile) {
      fetchBusyDays(currentMonth);
    }
  }, [profile, currentMonth]);

  // Load available slots from backend to ensure parity with master calendar
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate || !selectedService || !profile) return;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        setSlotsLoading(true);
        const { data, error } = await supabase.functions.invoke('get-available-slots', {
          body: { profileId: profile.id, date: dateStr, serviceId: selectedService },
        });
        if (error) throw error;
        const slots = (data as any)?.slots || [];
        setAvailableSlots(slots);
      } catch (e) {
        console.error('[booking] load available slots error', e);
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadSlots();
  }, [selectedDate, selectedService, profile]);

  const getAvailableTimeSlots = () => {
    return availableSlots;
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
          status: 'pending'
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
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.business_name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {profile.business_name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold mb-1">{profile.business_name}</h1>
              {profile.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{profile.description}</p>
              )}
              
              <div className="flex flex-col gap-1.5">
                {profile.phone && (
                  <a 
                    href={`tel:${profile.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors group w-fit"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <span className="font-medium">{profile.phone}</span>
                  </a>
                )}
              </div>
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
          
          <div className="grid gap-4">
            {services.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`group relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-2 border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-card border-2 border-border hover:border-primary/30 hover:shadow-xl hover:scale-[1.01]'
                  }`}
                >
                  {/* Animated background effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isSelected ? 'opacity-100' : ''}`}></div>
                  
                  {/* Decorative corner accent */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full"></div>
                  )}
                  
                  <div className="relative flex justify-between items-center gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Service name with icon */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground shadow-md' 
                            : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                        }`}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <h3 className={`font-bold text-lg transition-colors ${
                          isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
                        }`}>
                          {service.name}
                        </h3>
                      </div>
                      
                      {/* Description */}
                      {service.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                          {service.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Price section */}
                    <div className="flex flex-col items-end gap-2">
                      <div className={`text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent ${
                        isSelected ? 'scale-110' : ''
                      } transition-transform duration-300`}>
                        {service.price} ₽
                      </div>
                      
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-scale-in shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                month={currentMonth}
                onMonthChange={(month) => {
                  setCurrentMonth(month);
                  fetchBusyDays(month);
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = date < today;
                  return isPast || isDayBlocked(date) || isDayFull(date);
                }}
                modifiers={{
                  blocked: (date) => isDayBlocked(date),
                  full: (date) => isDayFull(date)
                }}
                modifiersClassNames={{
                  blocked: "bg-muted text-muted-foreground opacity-50",
                  full: "bg-muted text-muted-foreground opacity-50"
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
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Загружаем слоты...</span>
                </div>
              ) : workingHours.length === 0 ? (
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
                  {/* Modern booking summary card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 mb-4 border-2 border-primary/30 shadow-xl">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/30 to-transparent rounded-bl-full"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-tr-full"></div>
                    
                    <div className="relative space-y-4">
                      {/* Service */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Услуга</div>
                            <div className="font-semibold">{selectedServiceData?.name}</div>
                          </div>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Дата</div>
                            <div className="font-semibold text-sm">{format(selectedDate, 'd MMMM', { locale: ru })}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Время</div>
                            <div className="font-semibold text-sm">{selectedTime}</div>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="pt-4 border-t-2 border-primary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-muted-foreground">Итого</span>
                          <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            {selectedServiceData?.price} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-primary via-primary to-primary/80 hover:from-primary/90 hover:via-primary/90 hover:to-primary/80 font-bold text-lg shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/50 rounded-xl"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Создание записи...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Записаться</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
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
