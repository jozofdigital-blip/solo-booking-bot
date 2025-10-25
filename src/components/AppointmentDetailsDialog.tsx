import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Clock, User, FileText, Edit, Trash2, X } from "lucide-react";
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
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-telegram to-telegram/80 px-5 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 rounded-full p-1 bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{appointment.client_name}</h2>
              <Button 
                variant="link" 
                onClick={handleCall}
                className="p-0 h-auto text-white/90 hover:text-white text-sm font-normal -ml-1"
              >
                <Phone className="w-3.5 h-3.5 mr-1" />
                {appointment.client_phone}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Service Card - Compact */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-telegram/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-telegram" />
                </div>
                <p className="font-semibold truncate">{appointment.service_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-telegram/10 flex-shrink-0">
                <Calendar className="w-3 h-3 text-telegram" />
                <span className="text-xs font-medium text-telegram">
                  {format(new Date(appointment.appointment_date), "d MMM", { locale: ru })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-semibold">
                  {appointment.appointment_time.substring(0, 5)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section - Compact */}
          {(client?.notes || appointment.notes) && (
            <div className="space-y-2">
              {client?.notes && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Информация о клиенте
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{client.notes}</p>
                </div>
              )}

              {appointment.notes && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Комментарий
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{appointment.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Compact */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-lg font-medium hover:bg-muted"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Изменить
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10 rounded-lg font-medium"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
