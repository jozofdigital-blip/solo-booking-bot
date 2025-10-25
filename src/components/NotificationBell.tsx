import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notification_viewed: boolean;
  service_id: string;
  created_at: string;
}

interface NotificationBellProps {
  profileId: string;
  appointments: Appointment[];
  services: any[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export const NotificationBell = ({
  profileId,
  appointments,
  services,
  onAppointmentClick,
}: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Appointment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unviewed = appointments.filter(apt =>
      !apt.notification_viewed &&
      (apt.status === 'pending' || apt.status === 'cancelled' || apt.status === 'confirmed') &&
      !locallyReadIds.has(apt.id)
    );

    const sorted = [...unviewed].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(sorted);
    setUnreadCount(sorted.length);
  }, [appointments, locallyReadIds]);

  const handleNotificationClick = async (appointment: Appointment) => {
    // Optimistically mark as read locally so the red dot disappears immediately
    setLocallyReadIds((prev) => {
      const next = new Set(prev);
      next.add(appointment.id);
      return next;
    });

    // Open appointment details
    onAppointmentClick(appointment);
    setOpen(false);

    // Persist to backend
    const { error } = await supabase
      .from("appointments")
      .update({ notification_viewed: true })
      .eq("id", appointment.id);

    if (error) {
      // Rollback local change on error
      setLocallyReadIds((prev) => {
        const next = new Set(prev);
        next.delete(appointment.id);
        return next;
      });
      toast({
        title: "Не удалось отметить как прочитанное",
        description: "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const markAsReadById = async (id: string) => {
    // Optimistically mark as read locally
    setLocallyReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const { error } = await supabase
      .from("appointments")
      .update({ notification_viewed: true })
      .eq("id", id);
    if (error) {
      setLocallyReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast({
        title: "Не удалось отметить как прочитанное",
        description: "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllRead = async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    // Optimistically mark all as read locally
    setLocallyReadIds((prev) => new Set([...Array.from(prev), ...ids]));
    const { error } = await supabase
      .from("appointments")
      .update({ notification_viewed: true })
      .in("id", ids);
    if (error) {
      // Rollback on error
      setLocallyReadIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast({
        title: "Не удалось отметить все как прочитанные",
        description: "Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Услуга не найдена';
  };

  const getNotificationText = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') {
      return 'Отмена записи';
    }
    return 'Новая запись';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={async (e) => { e.stopPropagation(); await handleMarkAllRead(); }}>
                Прочитать все
              </Button>
            )}
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Нет новых уведомлений
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={notification.status === 'cancelled' ? 'destructive' : 'default'}
                        >
                          {getNotificationText(notification)}
                        </Badge>
                        <span
                          onClick={(e) => { e.stopPropagation(); markAsReadById(notification.id); }}
                          className="text-xs px-2 py-1 rounded border bg-background hover:bg-accent transition-colors cursor-pointer"
                        >
                          Прочитать
                        </span>
                      </div>
                      <p className="font-medium">{notification.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getServiceName(notification.service_id)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(notification.appointment_date), "d MMMM", { locale: ru })} 
                        {' в '}
                        {notification.appointment_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Создано: {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: ru })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
