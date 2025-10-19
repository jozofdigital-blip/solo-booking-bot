import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingCalendar } from "@/components/BookingCalendar";
import { ServicesList } from "@/components/ServicesList";
import { ServiceDialog } from "@/components/ServiceDialog";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { EditAppointmentDialog } from "@/components/EditAppointmentDialog";
import { WorkingHoursDialog } from "@/components/WorkingHoursDialog";
import { TelegramSettingsDialog } from "@/components/TelegramSettingsDialog";
import { ClientsDialog } from "@/components/ClientsDialog";
import { WeekCalendar } from "@/components/WeekCalendar";
import { Calendar, ClipboardList, LogOut, Share2, Settings, Clock, Bell, Edit2, Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [workingHoursDialogOpen, setWorkingHoursDialogOpen] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [editAppointmentDialogOpen, setEditAppointmentDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [calendarView, setCalendarView] = useState<"month" | "week">("week");
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [businessNameValue, setBusinessNameValue] = useState("");

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

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
        setProfile(newProfile);
      } else {
        setProfile(profileData);
        setBusinessNameValue(profileData.business_name);
      }

      // Load services
      if (profileData?.id) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('created_at', { ascending: false });

        setServices(servicesData || []);

        // Load appointments
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            *,
            services (name)
          `)
          .eq('profile_id', profileData.id)
          .order('appointment_date', { ascending: true });

        setAppointments(appointmentsData || []);

        // Load working hours
        const { data: workingHoursData } = await supabase
          .from('working_hours')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('day_of_week', { ascending: true });

        setWorkingHours(workingHoursData || []);

        // Load clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('name', { ascending: true });

        setClients(clientsData || []);
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

  const handleSaveAppointment = async (appointmentData: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          profile_id: profile.id,
          status: 'confirmed',
        });

      if (error) throw error;
      toast.success('Запись создана');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка создания записи');
      console.error(error);
    }
  };

  const handleUpdateAppointment = async (appointmentData: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          service_id: appointmentData.service_id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          client_name: appointmentData.client_name,
          client_phone: appointmentData.client_phone,
          notes: appointmentData.notes,
          status: appointmentData.status,
        })
        .eq('id', appointmentData.id);

      if (error) throw error;
      toast.success('Запись обновлена');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка обновления записи');
      console.error(error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Запись удалена');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка удаления записи');
      console.error(error);
    }
  };

  const handleAppointmentClick = (appointment: any) => {
    setEditingAppointment(appointment);
    setEditAppointmentDialogOpen(true);
  };

  const handleSaveWorkingHours = async (hours: any[]) => {
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
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения графика');
      console.error(error);
    }
  };

  const handleSaveTelegramChatId = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Telegram настроен');
      loadData();
    } catch (error: any) {
      toast.error('Ошибка настройки Telegram');
      console.error(error);
    }
  };

  const handleSaveBusinessName = async () => {
    if (!businessNameValue.trim()) {
      toast.error('Название компании не может быть пустым');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ business_name: businessNameValue.trim() })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Название компании обновлено');
      setEditingBusinessName(false);
      loadData();
    } catch (error: any) {
      toast.error('Ошибка обновления названия');
      console.error(error);
    }
  };

  const handleCancelEditBusinessName = () => {
    setBusinessNameValue(profile?.business_name || '');
    setEditingBusinessName(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Загрузка...</div>
      </div>
    );
  }

  const calculateEarnings = () => {
    return appointments
      .filter(a => a.status === 'confirmed' || a.status === 'completed')
      .reduce((total, apt) => {
        const service = services.find(s => s.id === apt.service_id);
        return total + (service?.price || 0);
      }, 0);
  };

  const stats = [
    {
      title: 'Записей сегодня',
      value: appointments.filter(a => {
        const today = new Date().toISOString().split('T')[0];
        return a.appointment_date === today;
      }).length,
      icon: Calendar,
      color: 'text-telegram',
      clickable: false
    },
    {
      title: 'Заработано',
      value: `${calculateEarnings().toLocaleString('ru-RU')} ₽`,
      icon: ClipboardList,
      color: 'text-success',
      clickable: false
    },
    {
      title: 'Активных услуг',
      value: services.filter(s => s.is_active).length,
      icon: Settings,
      color: 'text-warning',
      clickable: true,
      onClick: () => {
        setEditingService(null);
        setServiceDialogOpen(true);
      }
    },
    {
      title: 'Мои клиенты',
      value: clients.length,
      icon: Users,
      color: 'text-info',
      clickable: true,
      onClick: () => {
        setClientsDialogOpen(true);
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              {editingBusinessName ? (
                <div className="flex items-center gap-2 max-w-md">
                  <Input
                    value={businessNameValue}
                    onChange={(e) => setBusinessNameValue(e.target.value)}
                    className="text-xl font-bold"
                    placeholder="Название компании"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBusinessName();
                      if (e.key === 'Escape') handleCancelEditBusinessName();
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveBusinessName}
                    className="text-success hover:bg-success/10"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEditBusinessName}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile?.business_name}</h1>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingBusinessName(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Панель управления</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyBookingLink}>
                <Share2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Ссылка</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWorkingHoursDialogOpen(true)}>
                <Clock className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">График</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTelegramDialogOpen(true)}>
                <Bell className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Telegram</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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

        {/* Tabs */}
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="calendar">Календарь</TabsTrigger>
            <TabsTrigger value="services">Услуги</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  variant={calendarView === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("week")}
                  className={calendarView === "week" ? "bg-telegram hover:bg-telegram/90" : ""}
                >
                  Неделя
                </Button>
                <Button
                  variant={calendarView === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalendarView("month")}
                  className={calendarView === "month" ? "bg-telegram hover:bg-telegram/90" : ""}
                >
                  Месяц
                </Button>
              </div>
              {calendarView === "month" && (
                <Button
                  onClick={() => setAppointmentDialogOpen(true)}
                  className="bg-telegram hover:bg-telegram/90"
                  size="sm"
                >
                  Создать запись
                </Button>
              )}
            </div>

            {calendarView === "week" ? (
              <WeekCalendar
                appointments={appointments.map(a => {
                  const service = services.find(s => s.id === a.service_id);
                  return {
                    ...a,
                    appointment_time: `${a.appointment_date}T${a.appointment_time}`,
                    service_name: a.services?.name,
                    duration_minutes: service?.duration_minutes
                  };
                })}
                workingHours={workingHours}
                onCreateAppointment={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(format(date, "HH:mm"));
                  setAppointmentDialogOpen(true);
                }}
                onAppointmentClick={handleAppointmentClick}
              />
            ) : (
              <BookingCalendar 
                appointments={appointments.map(a => ({
                  ...a,
                  appointment_time: `${a.appointment_date}T${a.appointment_time}`,
                  service_name: a.services?.name
                }))}
                workingHours={workingHours}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(undefined);
                  setAppointmentDialogOpen(true);
                }}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
          </TabsContent>

          <TabsContent value="services">
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
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ServiceDialog
          open={serviceDialogOpen}
          onOpenChange={setServiceDialogOpen}
          onSave={handleSaveService}
          service={editingService}
        />

        <AppointmentDialog
          open={appointmentDialogOpen}
          onOpenChange={setAppointmentDialogOpen}
          onSave={handleSaveAppointment}
          services={services.filter(s => s.is_active)}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          profileId={profile?.id || ""}
          workingHours={workingHours}
        />

        <WorkingHoursDialog
          open={workingHoursDialogOpen}
          onOpenChange={setWorkingHoursDialogOpen}
          onSave={handleSaveWorkingHours}
          workingHours={workingHours}
        />

        <TelegramSettingsDialog
          open={telegramDialogOpen}
          onOpenChange={setTelegramDialogOpen}
          onSave={handleSaveTelegramChatId}
          currentChatId={profile?.telegram_chat_id}
        />

        <ClientsDialog
          open={clientsDialogOpen}
          onOpenChange={setClientsDialogOpen}
          profileId={profile?.id}
        />

        <EditAppointmentDialog
          open={editAppointmentDialogOpen}
          onOpenChange={setEditAppointmentDialogOpen}
          onSave={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
          services={services.filter(s => s.is_active)}
          appointment={editingAppointment}
          profileId={profile?.id || ""}
          workingHours={workingHours}
        />
      </main>
    </div>
  );
}
