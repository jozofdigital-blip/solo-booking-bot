import { useState, useEffect, useMemo } from "react";
import { Bell, Calendar, X } from "lucide-react";
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
}

export const NotificationBell = ({
  profileId,
  appointments,
  services,
}: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const [locallyReadIds, setLocallyReadIds] = useState<Set<string>>(new Set());

  // Мемоизация для оптимизации
  const { notifications, unreadCount } = useMemo(() => {
    const unviewed = appointments.filter(apt =>
      !apt.notification_viewed &&
      (apt.status === 'pending' || apt.status === 'cancelled' || apt.status === 'confirmed') &&
      !locallyReadIds.has(apt.id)
    );

    const sorted = [...unviewed].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      notifications: sorted,
      unreadCount: sorted.length
    };
  }, [appointments, locallyReadIds]);

  useEffect(() => {
    // Синхронизация локального состояния с сервером
    setLocallyReadIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      appointments.forEach((apt) => {
        if (!apt.notification_viewed && next.has(apt.id)) {
          next.delete(apt.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [appointments]);

  const markAsReadById = async (id: string) => {
    // Оптимистичное обновление
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
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <h3 className="font-semibold text-lg">Уведомления</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="px-2.5 py-0.5">{unreadCount}</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Нет новых уведомлений</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsReadById(notification.id)}
                  className="group relative p-4 hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 rounded-full p-2 ${
                      notification.status === 'cancelled' 
                        ? 'bg-destructive/10' 
                        : 'bg-primary/10'
                    }`}>
                      {notification.status === 'cancelled' ? (
                        <X className="h-4 w-4 text-destructive" />
                      ) : (
                        <Calendar className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2 min-w-0">
                      <Badge 
                        variant={notification.status === 'cancelled' ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {getNotificationText(notification)}
                      </Badge>
                      
                      <p className="font-semibold text-foreground">{notification.client_name}</p>
                      
                      <p className="text-sm text-muted-foreground truncate">
                        {getServiceName(notification.service_id)}
                      </p>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(notification.appointment_date), "d MMMM", { locale: ru })} 
                          {' в '}
                          {notification.appointment_time.slice(0, 5)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground/70">
                        {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: ru })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
