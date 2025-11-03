import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, Clock, MapPin, Phone, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  status: string;
  profile_id: string;
  notes?: string;
  cancellation_reason?: string;
  services: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  profiles: {
    business_name: string;
    address?: string;
    phone?: string;
  };
}

export default function MyAppointments() {
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>("");
  const [botUsername, setBotUsername] = useState<string>("");
  const [hasTelegram, setHasTelegram] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('client_booking_data');
    if (saved) {
      try {
        const { phone } = JSON.parse(saved);
        if (phone) setPhone(phone);
      } catch {}
    }
  }, []);

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

  const searchAppointments = async () => {
    if (!phone.trim()) {
      toast.error("Введите номер телефона");
      return;
    }

    setLoading(true);
    try {
      await loadBotUsername();

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          services (name, duration_minutes, price),
          profiles (business_name, address, phone)
        `)
        .eq("client_phone", phone.trim())
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;

      // Filter only upcoming and pending appointments
      const now = new Date();
      const upcomingAppointments = (data || []).filter((apt) => {
        const aptDateTime = parseISO(`${apt.appointment_date}T${apt.appointment_time}`);
        return !isPast(aptDateTime) && apt.status === "pending";
      });

      setAppointments(upcomingAppointments);
      setSearched(true);

      // Check if client has telegram connected
      if (upcomingAppointments.length > 0) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, telegram_chat_id")
          .eq("phone", phone.trim())
          .maybeSingle();

        if (clientData) {
          setClientId(clientData.id);
          setHasTelegram(!!clientData.telegram_chat_id);
        }
      }

      if (upcomingAppointments.length === 0) {
        toast.info("У вас нет активных записей");
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast.error("Ошибка при загрузке записей");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancellingId) return;

    try {
      const appointment = appointments.find((apt) => apt.id === cancellingId);
      if (!appointment) return;

      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "cancelled"
        })
        .eq("id", cancellingId);

      if (error) throw error;

      // Send notification to owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", appointment.profile_id)
        .maybeSingle();

      if (profileData?.telegram_chat_id) {
        await supabase.functions.invoke("send-telegram-notification", {
          body: {
            chatId: profileData.telegram_chat_id,
            clientName: appointment.client_name,
            serviceName: appointment.services.name,
            date: format(parseISO(appointment.appointment_date), "dd.MM.yyyy", { locale: ru }),
            time: appointment.appointment_time,
            phone: appointment.client_phone,
            appointmentId: appointment.id,
            appointmentDate: appointment.appointment_date,
            type: "cancelled",
            bookingUrl: `${window.location.origin}/dashboard`,
          },
        });
      }

      toast.success("Запись отменена");
      setAppointments((prev) => prev.filter((apt) => apt.id !== cancellingId));
      setCancellingId(null);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Ошибка при отмене записи");
    }
  };

  const handleConnectTelegram = () => {
    if (clientId && botUsername) {
      const deepLink = `https://t.me/${botUsername}?start=client_${clientId}`;
      window.open(deepLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-6 sm:py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Мои записи
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Управляйте своими записями в одном месте
          </p>
        </div>

        {/* Search Form */}
        <Card className="p-6 sm:p-8 mb-6 border-2 shadow-lg animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              placeholder="+7 (___) ___-__-__"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchAppointments()}
              className="h-12 text-base"
            />
            <Button
              onClick={searchAppointments}
              disabled={loading}
              className="h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-md"
            >
              {loading ? "Поиск..." : "Найти записи"}
            </Button>
          </div>
        </Card>

        {/* Telegram Connection Banner */}
        {searched && appointments.length > 0 && !hasTelegram && clientId && botUsername && (
          <Card className="p-5 sm:p-6 mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/30 shadow-lg animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1 text-base sm:text-lg">
                  📱 Подключите Telegram уведомления
                </h3>
                <p className="text-sm text-muted-foreground">
                  Получайте напоминания о записях и уведомления об изменениях
                </p>
              </div>
              <Button
                onClick={handleConnectTelegram}
                className="bg-gradient-to-r from-telegram to-telegram/80 hover:from-telegram/90 hover:to-telegram/70 transition-all shadow-md w-full sm:w-auto"
              >
                Подключить
              </Button>
            </div>
          </Card>
        )}

        {/* Appointments List */}
        {searched && (
          <div className="space-y-4 animate-fade-in">
            {appointments.length === 0 ? (
              <Card className="p-12 text-center border-2 shadow-lg">
                <div className="max-w-sm mx-auto">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Нет активных записей</h3>
                  <p className="text-sm text-muted-foreground">
                    У вас пока нет предстоящих записей
                  </p>
                </div>
              </Card>
            ) : (
              appointments.map((appointment, index) => (
                <Card 
                  key={appointment.id} 
                  className="p-6 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold mb-1 group-hover:text-primary transition-colors">
                        {appointment.profiles.business_name}
                      </h3>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full">
                        <span className="text-base sm:text-lg font-semibold text-primary">
                          {appointment.services.name}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCancellingId(appointment.id)}
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                    >
                      Отменить
                    </Button>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Дата</p>
                        <p className="font-semibold">
                          {format(parseISO(appointment.appointment_date), "d MMMM yyyy", {
                            locale: ru,
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Время</p>
                        <p className="font-semibold">
                          {appointment.appointment_time} ({appointment.services.duration_minutes} мин)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg sm:col-span-2">
                      <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Адрес</p>
                        <p className="font-medium">
                          {appointment.profiles.address || "Мастер не указал адрес"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg sm:col-span-2">
                      <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Контакт мастера</p>
                        {appointment.profiles.phone ? (
                          <a 
                            href={`tel:${appointment.profiles.phone}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {appointment.profiles.phone}
                          </a>
                        ) : (
                          <p className="font-medium text-muted-foreground">
                            Мастер не указал контакт
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <span className="font-medium text-muted-foreground">Стоимость услуги</span>
                    <span className="text-2xl font-bold text-primary">
                      {appointment.services.price} ₽
                    </span>
                  </div>

                  {/* Notes */}
                  {appointment.notes && (
                    <div className="mt-4 p-4 bg-muted/80 rounded-lg border-l-4 border-primary">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">ПРИМЕЧАНИЯ</p>
                      <p className="text-sm">{appointment.notes}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        <AlertDialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Отменить запись?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Вы уверены, что хотите отменить эту запись? Владелец получит уведомление об отмене.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="m-0">Отменить действие</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelAppointment}
                className="bg-destructive hover:bg-destructive/90 m-0"
              >
                Да, отменить запись
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
