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
          {/* Service with Date and Time */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Услуга</p>
                <p className="font-medium">{appointment.service_name}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(new Date(appointment.appointment_date), "d MMM", { locale: ru })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{appointment.appointment_time.substring(0, 5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">{appointment.client_name}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <Button 
                variant="link" 
                onClick={handleCall}
                className="p-0 h-auto font-medium text-telegram"
              >
                {appointment.client_phone}
              </Button>
            </div>
          </div>

          {/* Client Comment */}
          {client?.notes && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Заметка о клиенте</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* Appointment Notes */}
          {appointment.notes && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Комментарий к записи</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
