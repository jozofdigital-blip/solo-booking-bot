import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
          profiles (business_name, address)
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
        .update({ status: "cancelled" })
        .eq("id", cancellingId);

      if (error) throw error;

      // Send notification to owner
      const { data: profileData } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("id", appointment.profiles.business_name)
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
            type: "cancel",
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
    <div className="min-h-screen bg-gradient-to-br from-telegram-light to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-8 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Мои записи</h1>
            <p className="text-muted-foreground">
              Введите номер телефона, чтобы посмотреть ваши записи
            </p>
          </div>

          <div className="flex gap-3 max-w-md mx-auto">
            <Input
              placeholder="Номер телефона"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchAppointments()}
            />
            <Button
              onClick={searchAppointments}
              disabled={loading}
              className="bg-telegram hover:bg-telegram/90"
            >
              {loading ? "Поиск..." : "Найти"}
            </Button>
          </div>
        </Card>

        {searched && appointments.length > 0 && !hasTelegram && clientId && botUsername && (
          <Card className="p-6 mb-6 bg-telegram/5 border-telegram/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Подключите уведомления в Telegram</h3>
                <p className="text-sm text-muted-foreground">
                  Получайте напоминания о записях и уведомления об изменениях
                </p>
              </div>
              <Button
                onClick={handleConnectTelegram}
                className="bg-telegram hover:bg-telegram/90"
              >
                Подключить
              </Button>
            </div>
          </Card>
        )}

        {searched && (
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>У вас нет активных записей</p>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">
                        {appointment.profiles.business_name}
                      </h3>
                      <p className="text-lg text-telegram font-medium">
                        {appointment.services.name}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCancellingId(appointment.id)}
                    >
                      Отменить
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {format(parseISO(appointment.appointment_date), "d MMMM yyyy", {
                          locale: ru,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {appointment.appointment_time} ({appointment.services.duration_minutes}{" "}
                        мин)
                      </span>
                    </div>
                    {appointment.profiles.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{appointment.profiles.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{appointment.client_phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Стоимость:</span>
                      <span className="text-lg font-semibold">
                        {appointment.services.price} ₽
                      </span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                      <strong>Примечания:</strong> {appointment.notes}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        <AlertDialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите отменить эту запись? Владелец получит уведомление об
                отмене.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Нет</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelAppointment}>Да, отменить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
