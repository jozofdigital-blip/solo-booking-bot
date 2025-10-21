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
import { ClientsDialog } from "@/components/ClientsDialog";
import { NotificationsSection } from "@/components/NotificationsSection";
import { WeekCalendar } from "@/components/WeekCalendar";
import { ThreeDayCalendar } from "@/components/ThreeDayCalendar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar, Share2, MapPin, Users, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
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
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [calendarView, setCalendarView] = useState<"3days" | "week" | "month">("3days");
  const [todayAppointmentsOpen, setTodayAppointmentsOpen] = useState(false);
  const [tomorrowAppointmentsOpen, setTomorrowAppointmentsOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [isEditingBusinessName, setIsEditingBusinessName] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [currentSection, setCurrentSection] = useState("calendar");

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
        setBusinessName(newProfile.business_name);
      } else {
        setProfile(profileData);
        setBusinessName(profileData.business_name);
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
      setIsEditingBusinessName(false);
      loadData();
    } catch (error: any) {
      toast.error('Ошибка сохранения названия');
      console.error(error);
    }
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

  const todayAppointments = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.appointment_date === today;
  });

  const tomorrowAppointments = appointments.filter(a => {
    const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];
    return a.appointment_date === tomorrow;
  });

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
      title: 'Записи на завтра',
      value: tomorrowAppointments.length,
      icon: Calendar,
      color: 'text-blue-500',
      clickable: true,
      onClick: () => setTomorrowAppointmentsOpen(true)
    },
    {
      title: 'Заработано',
      value: `${calculateEarnings().toLocaleString('ru-RU')} ₽`,
      icon: TrendingUp,
      color: 'text-success',
      clickable: false
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar 
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {isEditingBusinessName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="text-xl font-bold border-b-2 border-primary bg-transparent outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveBusinessName();
                        if (e.key === 'Escape') {
                          setIsEditingBusinessName(false);
                          setBusinessName(profile?.business_name);
                        }
                      }}
                    />
                    <Button size="sm" onClick={handleSaveBusinessName}>✓</Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setIsEditingBusinessName(false);
                        setBusinessName(profile?.business_name);
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <h1 
                    className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsEditingBusinessName(true)}
                    title="Нажмите для редактирования"
                  >
                    {profile?.business_name}
                  </h1>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={copyBookingLink}>
                <Share2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Поделиться ссылкой</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              {currentSection === "calendar" && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
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

                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={calendarView === "3days" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCalendarView("3days")}
                      >
                        3 дня
                      </Button>
                      <Button
                        variant={calendarView === "week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCalendarView("week")}
                      >
                        Неделя
                      </Button>
                      <Button
                        variant={calendarView === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCalendarView("month")}
                      >
                        Месяц
                      </Button>
                    </div>

                    {calendarView === "3days" ? (
                      <ThreeDayCalendar
                        appointments={appointments.map(a => {
                          const service = services.find(s => s.id === a.service_id);
                          return {
                            ...a,
                            service_name: a.services?.name,
                            duration_minutes: service?.duration_minutes
                          };
                        })}
                        workingHours={workingHours}
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
                    ) : calendarView === "week" ? (
                      <WeekCalendar
                        appointments={appointments.map(a => {
                          const service = services.find(s => s.id === a.service_id);
                          return {
                            ...a,
                            service_name: a.services?.name,
                            duration_minutes: service?.duration_minutes
                          };
                        })}
                        workingHours={workingHours}
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
                        onDateSelect={(date) => {
                          setSelectedDate(date);
                          setSelectedTime(undefined);
                          setEditingAppointment(null);
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
                <div>
                  <h2 className="text-2xl font-bold mb-4">Мои клиенты</h2>
                  <Button onClick={() => setClientsDialogOpen(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Управление клиентами
                  </Button>
                </div>
              )}

              {currentSection === "notifications" && (
                <NotificationsSection />
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
            </div>
          </main>
        </div>

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

        <ClientsDialog
          open={clientsDialogOpen}
          onOpenChange={setClientsDialogOpen}
          profileId={profile?.id}
        />

        <Dialog open={todayAppointmentsOpen} onOpenChange={setTodayAppointmentsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Записи на сегодня</DialogTitle>
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

        <Dialog open={tomorrowAppointmentsOpen} onOpenChange={setTomorrowAppointmentsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Записи на завтра</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {tomorrowAppointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Записей нет</p>
              ) : (
                tomorrowAppointments.map((apt) => (
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
