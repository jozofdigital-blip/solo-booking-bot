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

  useEffect(() => {
    // Filter for unviewed notifications (новые записи и отмены)
    const unviewed = appointments.filter(apt => 
      !apt.notification_viewed && 
      (apt.status === 'pending' || apt.status === 'cancelled' || apt.status === 'confirmed')
    );
    
    // Sort by created_at descending
    const sorted = [...unviewed].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    setNotifications(sorted);
    setUnreadCount(sorted.length);
  }, [appointments]);

  const handleNotificationClick = (appointment: Appointment) => {
    // Open appointment details (notification_viewed will be marked in Dashboard)
    onAppointmentClick(appointment);
    setOpen(false);
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
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
