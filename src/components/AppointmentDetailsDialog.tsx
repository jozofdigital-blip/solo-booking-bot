import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Clock, User, FileText, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  notes?: string;
}

interface Client {
  notes?: string;
}

interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  client: Client | null;
  onEdit: () => void;
  onDelete: () => void;
}

export function AppointmentDetailsDialog({
  open,
  onOpenChange,
  appointment,
  client,
  onEdit,
  onDelete,
}: AppointmentDetailsDialogProps) {
  if (!appointment) return null;

  const handleCall = () => {
    window.location.href = `tel:${appointment.client_phone}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Детали записи</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Client Info Card */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-base">{appointment.client_name}</p>
                <p className="text-sm text-muted-foreground">{appointment.client_phone}</p>
              </div>
            </div>

            {/* Service, Date, Time */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{appointment.service_name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground font-medium">
                    {format(new Date(appointment.appointment_date), "d MMMM yyyy", { locale: ru })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground font-medium">
                    {appointment.appointment_time.substring(0, 5)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Client Notes */}
          {client?.notes && (
            <div className="p-4 border rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Информация о клиенте</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}

          {/* Appointment Notes */}
          {appointment.notes && (
            <div className="p-4 border rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Комментарий</p>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleCall}
            >
              <Phone className="w-4 h-4 mr-2" />
              Позвонить
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Изменить
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={onDelete}
              title="Удалить"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
