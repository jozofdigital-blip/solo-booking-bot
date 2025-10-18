import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingCalendar } from "@/components/BookingCalendar";
import { ServicesList } from "@/components/ServicesList";
import { Calendar, ClipboardList, LogOut, Share2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

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
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyBookingLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться ссылкой
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
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

          <TabsContent value="calendar">
            <BookingCalendar 
              appointments={appointments.map(a => ({
                ...a,
                appointment_time: `${a.appointment_date}T${a.appointment_time}`,
                service_name: a.services?.name
              }))}
            />
          </TabsContent>

          <TabsContent value="services">
            <ServicesList services={services} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
