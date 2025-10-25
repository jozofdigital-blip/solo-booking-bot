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
        <div className="relative bg-gradient-to-br from-telegram to-telegram/80 p-6 pb-8">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{appointment.client_name}</h2>
              <Button 
                variant="link" 
                onClick={handleCall}
                className="p-0 h-auto text-white/90 hover:text-white text-sm font-normal"
              >
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                {appointment.client_phone}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Service Card with modern design */}
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-telegram/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-telegram" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Услуга</p>
                </div>
                <p className="text-lg font-bold">{appointment.service_name}</p>
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-telegram/10">
                  <Calendar className="w-3.5 h-3.5 text-telegram" />
                  <span className="text-sm font-medium text-telegram">
                    {format(new Date(appointment.appointment_date), "d MMM", { locale: ru })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm font-semibold">
                    {appointment.appointment_time.substring(0, 5)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {(client?.notes || appointment.notes) && (
            <div className="space-y-3">
              {client?.notes && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-background flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      О клиенте
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{client.notes}</p>
                </div>
              )}

              {appointment.notes && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-background flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Комментарий
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed">{appointment.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl font-medium hover:bg-muted"
              onClick={onEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Изменить
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 rounded-xl font-medium"
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
