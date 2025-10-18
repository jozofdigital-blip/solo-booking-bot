import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/BookingCalendar";
import { ServicesList } from "@/components/ServicesList";
import { ServiceDialog } from "@/components/ServiceDialog";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { WorkingHoursDialog } from "@/components/WorkingHoursDialog";
import { TelegramSettingsDialog } from "@/components/TelegramSettingsDialog";
import { WeekCalendar } from "@/components/WeekCalendar";
import { Calendar, ClipboardList, LogOut, Share2, Settings, Clock, Bell } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [workingHoursDialogOpen, setWorkingHoursDialogOpen] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarView, setCalendarView] = useState<"month" | "week">("week");

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg">Загрузка...</div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Записей сегодня',
      value: appointments.filter(a => {
        const today = new Date().toISOString().split('T')[0];
        return a.appointment_date === today;
      }).length,
      icon: Calendar,
      color: 'text-telegram'
    },
    {
      title: 'Всего записей',
      value: appointments.length,
      icon: ClipboardList,
      color: 'text-success'
    },
    {
      title: 'Активных услуг',
      value: services.filter(s => s.is_active).length,
      icon: Settings,
      color: 'text-warning'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{profile?.business_name}</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <Icon className={`w-12 h-12 ${stat.color} opacity-50`} />
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
              <Button
                onClick={() => setAppointmentDialogOpen(true)}
                className="bg-telegram hover:bg-telegram/90"
                size="sm"
              >
                Создать запись
              </Button>
            </div>

            {calendarView === "week" ? (
              <WeekCalendar
                appointments={appointments.map(a => ({
                  ...a,
                  appointment_time: `${a.appointment_date}T${a.appointment_time}`,
                  service_name: a.services?.name
                }))}
                onCreateAppointment={(date) => {
                  setSelectedDate(date);
                  setAppointmentDialogOpen(true);
                }}
              />
            ) : (
              <BookingCalendar 
                appointments={appointments.map(a => ({
                  ...a,
                  appointment_time: `${a.appointment_date}T${a.appointment_time}`,
                  service_name: a.services?.name
                }))}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setAppointmentDialogOpen(true);
                }}
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
      </main>
    </div>
  );
}
