import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ru } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { hasAppointmentOverlap } from "@/lib/utils";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";
import { bookingCache } from "@/lib/booking-cache";

const CACHE_TTL = 30000; // 30 seconds

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
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [botUsername, setBotUsername] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [clientHasTelegram, setClientHasTelegram] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busyCounts, setBusyCounts] = useState<Record<string, number>>({});
  const [slotsByDate, setSlotsByDate] = useState<Record<string, any[]>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Load client data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('client_booking_data');
    if (savedData) {
      try {
        const { name, phone } = JSON.parse(savedData);
        setClientName(name || '');
        setClientPhone(phone || '+7');
      } catch (error) {
        // Ignore
      }
    }
  }, []);

  // Load profile and initial data
  useEffect(() => {
    if (!slug) return;
    
    const loadInitialData = async () => {
      try {
        const data = await apiClient.getBookingData(slug);

        if (!data?.profile) {
          throw new Error('Profile not found');
        }

        setProfile(data.profile);
        setServices(data.services || []);
        setWorkingHours(data.workingHours || []);
        setBusyCounts(data.busyCounts || {});
        setSlotsByDate(data.slotsByDate || {});

        if (data.botUsername) {
          setBotUsername(data.botUsername);
        }

        if (data.client) {
          setClientId(data.client.id ?? '');
          setClientHasTelegram(Boolean(data.client.has_telegram ?? data.client.telegram_chat_id));
        }

        const today = new Date();
        const startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(addMonths(today, 1)), 'yyyy-MM-dd');

        await fetchBookingData(data.profile.id, startDate, endDate);
      } catch (error) {
        console.error('Failed to load booking data:', error);
        toast.error('Профиль не найден');
      }
    };

    loadInitialData();
  }, [slug]);

  // Fetch booking data with caching
  const fetchBookingData = useCallback(async (profileId: string, startDate: string, endDate: string) => {
    const cacheKey = `${profileId}-${startDate}-${endDate}`;
    const cached = bookingCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setBusyCounts(cached.data.busyCounts);
      setSlotsByDate(cached.data.slotsByDate);
      return;
    }

    try {
      const data = await apiClient.getBookingData(slug, { startDate, endDate });

      const bookingData = {
        busyCounts: data?.busyCounts || {},
        slotsByDate: data?.slotsByDate || {}
      };

      bookingCache.set(cacheKey, { data: bookingData, timestamp: Date.now() });
      setBusyCounts(bookingData.busyCounts);
      setSlotsByDate(bookingData.slotsByDate);
    } catch (err) {
      console.error('Error fetching booking data:', err);
    }
  }, [slug]);

  // Update booking data when month changes
  useEffect(() => {
    if (!profile) return;
    
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
    fetchBookingData(profile.id, startDate, endDate);
  }, [profile, currentMonth, fetchBookingData]);

  // Scroll to sections
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

  const isDayBlocked = useCallback((date: Date) => {
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find((wh: any) => wh.day_of_week === dayOfWeek);
    return !workingDay?.is_working;
  }, [workingHours]);

  const isDayFull = useCallback((date: Date) => {
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
  }, [workingHours, busyCounts]);

  // Calculate available time slots
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !selectedService || !profile) return [];

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = selectedDate.getDay();
    const workingDay = workingHours?.find((wh: any) => wh.day_of_week === dayOfWeek && wh.is_working);
    
    if (!workingDay) return [];

    const selectedServiceData = services.find(s => s.id === selectedService);
    if (!selectedServiceData) return [];

    const serviceDuration = selectedServiceData.duration_minutes || 60;
    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const startMinute = parseInt(workingDay.start_time.split(':')[1]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    const endMinute = parseInt(workingDay.end_time.split(':')[1]);
    
    const startMins = startHour * 60 + startMinute;
    const endMins = endHour * 60 + endMinute;

    const appointments = slotsByDate[dateStr] || [];
    const busy = appointments.map((a: any) => {
      const [h, m] = a.appointment_time.split(':').map(Number);
      const start = h * 60 + m;
      const end = start + (a.duration_minutes || 60);
      return { start, end };
    });

    // Check if selected date is today
    const now = new Date();
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const currentMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

    const slots: string[] = [];
    for (let t = startMins; t + serviceDuration <= endMins; t += 30) {
      // Skip past time slots for today
      if (isToday && t <= currentMins) {
        continue;
      }

      const slotEnd = t + serviceDuration;
      const overlap = busy.some(b => t < b.end && b.start < slotEnd);
      
      if (!overlap) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }

    return slots;
  }, [selectedDate, selectedService, profile, workingHours, services, slotsByDate]);

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    if (clientPhone.length < 12) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    if (clientName.trim().length < 2) {
      toast.error('Введите корректное имя');
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const result = await apiClient.createBooking({
        profile_id: profile.id,
        service_id: selectedService,
        client_name: clientName,
        client_phone: clientPhone,
        appointment_date: dateStr,
        appointment_time: selectedTime,
      });

      localStorage.setItem('client_booking_data', JSON.stringify({ name: clientName, phone: clientPhone }));

      if (result?.client) {
        setClientId(result.client.id ?? '');
        setClientHasTelegram(Boolean(result.client.has_telegram ?? result.client.telegram_chat_id));
      } else if (result?.client_id) {
        setClientId(result.client_id);
        setClientHasTelegram(Boolean(result.client_has_telegram));
      }

      bookingCache.clear();
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
      await fetchBookingData(profile.id, startDate, endDate);

      toast.success('Запись успешно создана!');
      setSuccessDialogOpen(true);

      setSelectedService(null);
      setSelectedTime('');
    } catch (error: any) {
      if (error?.message?.includes('OVERLAP_TIME_SLOT')) {
        toast.error('Это время уже занято. Выберите другое время.');
        bookingCache.clear();
        const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');
        await fetchBookingData(profile.id, startDate, endDate);
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
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center gap-4">
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
                <p className="text-xs text-muted-foreground line-clamp-1">{profile.description}</p>
              )}
            </div>

            {profile.phone && (
              <a 
                href={`tel:${profile.phone}`}
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center text-white transition-all shadow-md hover:shadow-lg hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Services */}
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
                  className={`group relative p-4 rounded-xl text-left transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-2 border-primary shadow-lg shadow-primary/20'
                      : 'bg-card border-2 border-border hover:border-primary/30 hover:shadow-md hover:scale-[1.01]'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-500 ${isSelected ? 'opacity-100' : ''}`}></div>
                  
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full"></div>
                  )}
                  
                  <div className="relative z-10">
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${isSelected ? 'text-primary' : ''}`}>
                      {service.name}
                    </h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.duration_minutes} мин
                      </span>
                      <span className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {service.price.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar */}
        {selectedService && (
          <div ref={calendarRef} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Выберите дату</h2>
            </div>
            <div className="w-full">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ru}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || isDayBlocked(date) || isDayFull(date)}
                onMonthChange={setCurrentMonth}
                className="w-full rounded-md border bg-card"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-base font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-2",
                  nav_button_next: "absolute right-2",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-sm",
                  row: "flex w-full mt-2",
                  cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md text-base",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
                  day_today: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50 line-through",
                  day_hidden: "invisible",
                }}
              />
            </div>
          </div>
        )}

        {/* Time Slots */}
        {selectedDate && selectedService && (
          <div ref={timeRef} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Выберите время</h2>
            </div>
            
            {slotsLoading ? (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">Загрузка слотов...</div>
              </Card>
            ) : availableTimeSlots.length === 0 ? (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">Нет доступных слотов на эту дату</div>
              </Card>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {availableTimeSlots.map((time) => (
                  <Button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    variant={selectedTime === time ? "default" : "outline"}
                    className="h-12 text-base font-medium"
                  >
                    {time}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Form */}
        {selectedTime && (
          <div ref={contactRef} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h2 className="text-xl font-bold">Ваши данные</h2>
            </div>
            
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Имя</label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Введите ваше имя"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Телефон</label>
                <Input
                  type="tel"
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
                  placeholder="+79998887766"
                />
              </div>

              <Button
                onClick={handleBooking}
                disabled={loading}
                className="w-full h-12 text-lg font-semibold"
              >
                {loading ? 'Создание записи...' : 'Записаться'}
              </Button>
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
