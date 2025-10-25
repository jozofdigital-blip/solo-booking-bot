import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/BookingCalendar";
import { ServicesList } from "@/components/ServicesList";
import { ServiceDialog } from "@/components/ServiceDialog";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AddressDialog } from "@/components/AddressDialog";
import { ClientsList } from "@/components/ClientsList";
import { NotificationsSection } from "@/components/NotificationsSection";
import { WeekCalendar } from "@/components/WeekCalendar";
import { ThreeDayCalendar } from "@/components/ThreeDayCalendar";
import { AppSidebar } from "@/components/AppSidebar";
import { CancelAppointmentDialog } from "@/components/CancelAppointmentDialog";
import {
  DEFAULT_WORKING_HOURS,
  WorkingHour,
  WorkingHoursDialog,
} from "@/components/WorkingHoursDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar, MapPin, TrendingUp, ArrowLeft, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ru } from "date-fns/locale";
type DashboardMode = "main" | "calendar";

interface DashboardProps {
  mode?: DashboardMode;
}

export default function Dashboard({ mode = "main" }: DashboardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(() =>
    DEFAULT_WORKING_HOURS.map((hour) => ({ ...hour }))
  );
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [calendarView, setCalendarView] = useState<"3days" | "week" | "month">(
    mode === "calendar" ? "week" : "3days"
  );
  const [todayAppointmentsOpen, setTodayAppointmentsOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [businessNameDialogOpen, setBusinessNameDialogOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currentSection, setCurrentSection] = useState("calendar");
  const [workingHoursDialogOpen, setWorkingHoursDialogOpen] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState<string | null>(null);
  const [highlightColor, setHighlightColor] = useState<'green' | 'red' | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const isCalendarPage = mode === "calendar";

  // Check URL params for appointment highlight
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appointmentId = params.get('id');
    const highlight = params.get('highlight') as 'green' | 'red' | null;
    const dateParam = params.get('date');
    
    if (appointmentId && highlight) {
      setHighlightedAppointmentId(appointmentId);
      setHighlightColor(highlight);
      setCurrentSection('calendar');
      setCalendarView('3days');
      
      // Set the date from URL param
      if (dateParam) {
        try {
          const targetDate = new Date(dateParam);
          setSelectedDate(targetDate);
        } catch (e) {
          console.error('Invalid date in URL param:', e);
        }
      }
      
      // Clear highlight after marking as viewed
      const markAsViewed = async () => {
        await supabase
          .from('appointments')
          .update({ notification_viewed: true })
          .eq('id', appointmentId);
      };
      markAsViewed();
      
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setCalendarView(mode === "calendar" ? "week" : "3days");
    setCurrentSection("calendar");
  }, [mode]);

  const mergeWithDefaultWorkingHours = (hours?: any[]): WorkingHour[] => {
    const ensureTimeFormat = (time: string, fallback: string) => {
      if (!time) return fallback;
      return time.length > 5 ? time.substring(0, 5) : time;
    };

    const providedHours = Array.isArray(hours) ? hours : [];

    return DEFAULT_WORKING_HOURS.map((defaultHour) => {
      const existing = providedHours.find(
        (hour) => hour.day_of_week === defaultHour.day_of_week
      );

      if (!existing) {
        return { ...defaultHour };
      }

      return {
        day_of_week: existing.day_of_week,
        start_time: ensureTimeFormat(existing.start_time, defaultHour.start_time),
        end_time: ensureTimeFormat(existing.end_time, defaultHour.end_time),
        is_working:
          typeof existing.is_working === "boolean"
            ? existing.is_working
            : defaultHour.is_working,
      };
    });
  };

  useEffect(() => {
    checkAuth();
    loadData();

    // Real-time subscription для обновления профиля
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile?.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          setProfile(payload.new);
        }
      )
      .subscribe();

    // Обновление при возврате на страницу
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      let currentProfile = profileData;
      
      if (!profileData) {
        // Create profile if doesn't exist
        const slug = await generateSlug();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            business_name: 'Мой бизнес',
            unique_slug: slug
          })
          .select()
          .single();

        if (createError) throw createError;
        
        // Создать рабочие часы по умолчанию
        const defaultHours = DEFAULT_WORKING_HOURS.map(hour => ({
          ...hour,
          profile_id: newProfile.id
        }));
        
        await supabase
          .from('working_hours')
          .insert(defaultHours);
        
        currentProfile = newProfile;
      }
      
      setProfile(currentProfile);
      setBusinessName(currentProfile.business_name);
      
      // Check subscription status for all users
      checkSubscriptionStatus(currentProfile);

      // Load services
      if (profileData?.id) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('created_at', { ascending: false });

        setServices(servicesData || []);

        // Load appointments with service duration
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            *,
            services (name, duration_minutes)
          `)
          .eq('profile_id', profileData.id)
          .neq('status', 'cancelled')
          .order('appointment_date', { ascending: true });

        setAppointments(appointmentsData || []);

        // Load working hours
        const { data: workingHoursData } = await supabase
          .from('working_hours')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('day_of_week', { ascending: true });

        // Если нет рабочих часов, создать по умолчанию
        if (!workingHoursData || workingHoursData.length === 0) {
          const defaultHours = DEFAULT_WORKING_HOURS.map(hour => ({
            ...hour,
            profile_id: profileData.id
          }));
          
          await supabase
            .from('working_hours')
            .insert(defaultHours);
          
          setWorkingHours(DEFAULT_WORKING_HOURS);
        } else {
          setWorkingHours(mergeWithDefaultWorkingHours(workingHoursData));
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = async () => {
    const { data, error } = await supabase.rpc('generate_unique_slug');
    if (error) throw error;
    return data;
  };

  const checkSubscriptionStatus = (profileData: any) => {
    const now = new Date();
    
    // Check if user has active paid subscription
    if (profileData.subscription_end_date) {
      const endDate = new Date(profileData.subscription_end_date);
      const days = differenceInDays(endDate, now);
      if (days > 0) {
        setDaysLeft(days);
        setIsTrial(false);
        return;
      }
    }
    
    // Check trial period
    if (profileData.trial_end_date) {
      const trialEnd = new Date(profileData.trial_end_date);
      const days = differenceInDays(trialEnd, now);
      if (days > 0) {
        setDaysLeft(days);
        setIsTrial(true);
        return;
      }
    }
    
    // No active subscription or trial - block access
    navigate('/subscription-blocked');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const copyBookingLink = () => {
    const link = `${window.location.origin}/book/${profile?.unique_slug}`;
    navigator.clipboard.writeText(link);
    toast.success('Ссылка скопирована!');
  };

  const handleSaveService = async (serviceData: any) => {
    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Услуга обновлена');
      } else {
        const { error } = await supabase
          .from('services')
          .insert({ ...serviceData, profile_id: profile.id });

        if (error) throw error;
        toast.success('Услуга добавлена');
      }
      
      loadData();
      setEditingService(null);
    } catch (error: any) {
      toast.error('Ошибка сохранения услуги');
      console.error(error);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Услуга удалена');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка удаления услуги');
      console.error(error);
    }
  };

  const sendTelegramNotification = async (
    appointmentData: any,
    type: 'new' | 'cancelled'
  ) => {
    if (!profile?.telegram_chat_id) return;

    try {
      const service = services.find(s => s.id === appointmentData.service_id);
      const bookingUrl = 'https://looktime.pro/dashboard';
      
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          chatId: profile.telegram_chat_id,
          clientName: appointmentData.client_name,
          serviceName: service?.name || 'Услуга',
          date: format(new Date(appointmentData.appointment_date), 'd MMMM yyyy', { locale: ru }),
          time: appointmentData.appointment_time.substring(0, 5),
          phone: appointmentData.client_phone,
          appointmentId: appointmentData.id,
          appointmentDate: appointmentData.appointment_date,
          type,
          bookingUrl,
        },
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleSaveAppointment = async (appointmentData: any) => {
    try {
      // Save client if new
      if (appointmentData.client_name && appointmentData.client_phone) {
        const { data: existingClients } = await supabase
          .from("clients")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("phone", appointmentData.client_phone);
        
        if (!existingClients || existingClients.length === 0) {
          await supabase.from("clients").insert({
            profile_id: profile.id,
            name: appointmentData.client_name,
            phone: appointmentData.client_phone,
          });
        }
      }

      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          profile_id: profile.id,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Send Telegram notification
      if (newAppointment) {
        await sendTelegramNotification({...appointmentData, id: newAppointment.id}, 'new');
      }
      
      toast.success('Запись создана');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка создания записи');
      console.error(error);
    }
  };

  const handleSaveWorkingHours = async (hours: WorkingHour[]) => {
    if (!profile?.id) {
      toast.error('Профиль не найден');
      return;
    }

    try {
      // Delete existing working hours
      await supabase
        .from('working_hours')
        .delete()
        .eq('profile_id', profile.id);

      // Insert new working hours
      const { error } = await supabase
        .from('working_hours')
        .insert(hours.map(h => ({ ...h, profile_id: profile.id })));

      if (error) throw error;
      toast.success('График работы сохранен');
      setWorkingHours(mergeWithDefaultWorkingHours(hours));
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения графика');
      console.error(error);
    }
  };

  const handleSaveAddress = async (address: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ address })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Адрес сохранен');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения адреса');
      console.error(error);
    }
  };

  const handleSaveBusinessName = async () => {
    if (!businessName.trim()) {
      toast.error('Название не может быть пустым');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ business_name: businessName })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Название обновлено');
      setBusinessNameDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения названия');
      console.error(error);
    }
  };

  const openBusinessNameDialog = () => {
    setBusinessName(profile?.business_name || "");
    setBusinessNameDialogOpen(true);
  };

  const handleUpdateAppointment = async (appointmentId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Запись обновлена');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка обновления записи');
      console.error(error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    setCancellingAppointmentId(appointmentId);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async (reason?: string) => {
    if (!cancellingAppointmentId) return;

    setCancelLoading(true);
    try {
      // Get appointment and service data before cancellation
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          services (name)
        `)
        .eq('id', cancellingAppointmentId)
        .single();

      // Update status to cancelled instead of deleting
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason
        })
        .eq('id', cancellingAppointmentId);

      if (error) throw error;
      
      // Send cancellation notification to client if they have telegram
      if (appointment?.client_phone) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('telegram_chat_id')
          .eq('phone', appointment.client_phone)
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (clientData?.telegram_chat_id) {
          try {
            const response = await supabase.functions.invoke('send-client-notification', {
              body: {
                chatId: clientData.telegram_chat_id,
                type: 'cancellation',
                clientName: appointment.client_name,
                serviceName: (appointment.services as any)?.name || '',
                date: format(new Date(appointment.appointment_date), 'dd MMMM yyyy', { locale: ru }),
                time: appointment.appointment_time,
                businessName: profile.business_name,
                address: profile.address,
                cancellationReason: reason,
              },
            });
          } catch (notificationError) {
            console.error('Failed to send cancellation notification:', notificationError);
          }
        }
      }

      // Send cancellation notification to owner (existing notification)
      if (appointment) {
        await sendTelegramNotification(appointment, 'cancelled');
      }
      
      toast.success('Запись отменена');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка отмены записи');
      console.error(error);
    } finally {
      setCancelLoading(false);
      setCancelDialogOpen(false);
      setCancellingAppointmentId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Загрузка...</div>
      </div>
    );
  }

  const todayDate = new Date().toISOString().split('T')[0];

  const todayAppointments = appointments.filter(a => a.appointment_date === todayDate);

  // Calculate minimum service duration from active services
  const getMinServiceDuration = () => {
    const activeServices = services.filter(s => s.is_active);
    if (activeServices.length === 0) return 60;
    return Math.min(...activeServices.map(s => s.duration_minutes || 60));
  };

  const minServiceDuration = getMinServiceDuration();

  const calculateTodayEarnings = () => {
    return todayAppointments.reduce((total, apt) => {
      const service = services.find(s => s.id === apt.service_id);
      return total + (service?.price || 0);
    }, 0);
  };

  const stats = [
    {
      title: 'Записей сегодня',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'text-telegram',
      clickable: true,
      onClick: () => setTodayAppointmentsOpen(true)
    },
    {
      title: 'Заработок',
      value: `${calculateTodayEarnings().toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: 'text-success',
      clickable: false
    }
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Main content first so the sidebar appears on the right */}
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card px-4 py-3">
            <div className="flex justify-between items-center w-full">
              {currentSection !== "calendar" ? (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentSection("calendar")}
                  className="gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  На главную
                </Button>
              ) : (
                <div className="flex flex-col gap-1">
                  <h1 
                    className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate('/dashboard')}
                    title="Перейти на дашборд"
                  >
                    {profile?.business_name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), "d MMMM", { locale: ru })}
                  </p>
                </div>
              )}
              <SidebarTrigger />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              {currentSection === "calendar" && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
                    {stats.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <Card 
                          key={stat.title} 
                          className={`p-4 md:p-6 transition-all ${
                            stat.clickable 
                              ? 'hover:shadow-lg cursor-pointer hover:scale-105' 
                              : 'hover:shadow-lg'
                          }`}
                          onClick={stat.clickable ? stat.onClick : undefined}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs md:text-sm text-muted-foreground">{stat.title}</p>
                              <p className="text-2xl md:text-3xl font-bold mt-2">{stat.value}</p>
                            </div>
                            <Icon className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} opacity-50`} />
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Calendar view switcher */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <Button
                      variant={calendarView === "3days" && !isCalendarPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCalendarView("3days");
                        navigate("/dashboard");
                      }}
                      className="w-full"
                    >
                      3 дня
                    </Button>
                    <Button
                      variant={calendarView === "week" && isCalendarPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCalendarView("week");
                        navigate("/dashboard/calendar");
                      }}
                      className="w-full"
                    >
                      Неделя
                    </Button>
                    <Button
                      variant={calendarView === "month" && isCalendarPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setCalendarView("month");
                        navigate("/dashboard/calendar");
                      }}
                      className="w-full"
                    >
                      Месяц
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {isCalendarPage ? (
                      <>
                        {calendarView === "week" ? (
                          <WeekCalendar
                            appointments={appointments.map(a => {
                              const service = services.find(s => s.id === a.service_id);
                              return {
                                ...a,
                                service_name: a.services?.name || service?.name,
                                duration_minutes: a.services?.duration_minutes || service?.duration_minutes
                              };
                            })}
                            workingHours={workingHours}
                            minServiceDuration={minServiceDuration}
                            onCreateAppointment={(date, time) => {
                              setSelectedDate(new Date(date));
                              setSelectedTime(time);
                              setEditingAppointment(null);
                              setAppointmentDialogOpen(true);
                            }}
                            onAppointmentClick={(apt) => {
                              setEditingAppointment(apt);
                              setAppointmentDialogOpen(true);
                            }}
                          />
                         ) : (
                          <BookingCalendar
                            appointments={appointments.map(a => ({
                              ...a,
                              service_name: a.services?.name
                            }))}
                            workingHours={workingHours}
                            onDateSelect={(date) => {
                              setSelectedDate(date);
                              setSelectedTime(undefined);
                              setEditingAppointment(null);
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <ThreeDayCalendar
                        appointments={appointments.map(a => {
                          const service = services.find(s => s.id === a.service_id);
                          return {
                            ...a,
                            service_name: a.services?.name || service?.name,
                            duration_minutes: a.services?.duration_minutes || service?.duration_minutes
                          };
                        })}
                        workingHours={workingHours}
                        minServiceDuration={minServiceDuration}
                        highlightedAppointmentId={highlightedAppointmentId}
                        highlightColor={highlightColor}
                        onClearHighlight={() => {
                          setHighlightedAppointmentId(null);
                          setHighlightColor(null);
                        }}
                        onCreateAppointment={(date, time) => {
                          setSelectedDate(new Date(date));
                          setSelectedTime(time);
                          setEditingAppointment(null);
                          setAppointmentDialogOpen(true);
                        }}
                        onAppointmentClick={(apt) => {
                          setEditingAppointment(apt);
                          setAppointmentDialogOpen(true);
                        }}
                      />
                    )}
                  </div>
                </>
              )}

              {currentSection === "services" && (
                <ServicesList
                  services={services}
                  onAdd={() => {
                    setEditingService(null);
                    setServiceDialogOpen(true);
                  }}
                  onEdit={(service) => {
                    setEditingService(service);
                    setServiceDialogOpen(true);
                  }}
                  onDelete={handleDeleteService}
                />
              )}

              {currentSection === "clients" && (
                <ClientsList profileId={profile?.id} />
              )}

              {currentSection === "notifications" && (
                <NotificationsSection 
                  profileId={profile?.id}
                  telegramChatId={profile?.telegram_chat_id}
                />
              )}

              {currentSection === "address" && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Мой адрес</h2>
                  <Card className="p-6">
                    <p className="text-muted-foreground mb-4">
                      {profile?.address || "Адрес не указан"}
                    </p>
                    <Button onClick={() => setAddressDialogOpen(true)}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Изменить адрес
                    </Button>
                  </Card>
                </div>
              )}

              {currentSection === "booking-link" && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Ссылка для клиентов</h2>
                  <Card className="p-6 space-y-4">
                    <p className="text-muted-foreground">
                      Эту ссылку вы можете вставить в описание своего Telegram, Инстаграм, отправлять в WhatsApp и т.д.
                    </p>
                    <div className="p-4 bg-muted rounded-lg break-all text-sm">
                      {`${window.location.origin}/book/${profile?.unique_slug}`}
                    </div>
                    <Button onClick={copyBookingLink} className="w-full">
                      <Share2 className="w-4 h-4 mr-2" />
                      Скопировать ссылку
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
        {/* Sidebar on the right */}
        <AppSidebar
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onLogout={handleLogout}
          onOpenWorkingHours={() => setWorkingHoursDialogOpen(true)}
          onEditBusinessName={openBusinessNameDialog}
          onOpenSubscription={() => navigate('/subscription')}
          daysLeft={daysLeft}
          isTrial={isTrial}
        />
        {/* Dialogs */}
        <ServiceDialog
          open={serviceDialogOpen}
          onOpenChange={setServiceDialogOpen}
          onSave={handleSaveService}
          service={editingService}
        />

        <AppointmentDialog
          open={appointmentDialogOpen}
          onOpenChange={(open) => {
            setAppointmentDialogOpen(open);
            if (!open) {
              setEditingAppointment(null);
              setSelectedDate(undefined);
              setSelectedTime(undefined);
            }
          }}
          onSave={handleSaveAppointment}
          onUpdate={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
          services={services.filter(s => s.is_active)}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          appointment={editingAppointment}
          profileId={profile?.id}
        />

        <AddressDialog
          open={addressDialogOpen}
          onOpenChange={setAddressDialogOpen}
          currentAddress={profile?.address}
          onSave={handleSaveAddress}
        />

        <WorkingHoursDialog
          open={workingHoursDialogOpen}
          onOpenChange={setWorkingHoursDialogOpen}
          workingHours={workingHours}
          onSave={handleSaveWorkingHours}
        />

        <CancelAppointmentDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleConfirmCancel}
          loading={cancelLoading}
        />

        <Dialog open={businessNameDialogOpen} onOpenChange={setBusinessNameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Изменить название</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Введите новое название для вашего бизнеса
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название бизнеса</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Введите название"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBusinessName();
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setBusinessNameDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button onClick={handleSaveBusinessName}>
                  Сохранить
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        <Dialog open={todayAppointmentsOpen} onOpenChange={setTodayAppointmentsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Записи на сегодня</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Все ваши записи на сегодняшний день
              </p>
            </DialogHeader>
            <div className="space-y-2">
              {todayAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Записей нет</p>
              ) : (
                todayAppointments.map((apt) => (
                  <div key={apt.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{apt.client_name}</p>
                        <p className="text-sm text-muted-foreground">{apt.services?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {apt.appointment_time.substring(0, 5)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </SidebarProvider>
  );
}
