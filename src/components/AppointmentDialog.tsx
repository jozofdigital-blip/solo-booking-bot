import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_minutes?: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  notes?: string;
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (appointment: {
    service_id: string;
    appointment_date: string;
    appointment_time: string;
    client_name: string;
    client_phone: string;
    notes?: string;
  }) => void;
  onUpdate?: (id: string, updates: any) => void;
  onDelete?: (id: string) => void;
  services: Service[];
  selectedDate?: Date;
  selectedTime?: string;
  appointment?: Appointment | null;
  profileId?: string;
}

export const AppointmentDialog = ({
  open,
  onOpenChange,
  onSave,
  onUpdate,
  onDelete,
  services,
  selectedDate,
  selectedTime,
  appointment,
  profileId,
}: AppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    service_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "10:00",
    client_name: "",
    client_phone: "",
    notes: "",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [selectClientDialogOpen, setSelectClientDialogOpen] = useState(false);

  useEffect(() => {
    if (open && profileId) {
      loadClients();
    }
  }, [open, profileId]);

  useEffect(() => {
    if (appointment) {
      setFormData({
        service_id: appointment.service_id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time.substring(0, 5),
        client_name: appointment.client_name,
        client_phone: appointment.client_phone,
        notes: appointment.notes || "",
      });
    } else {
      const date = selectedDate ? format(selectedDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const time = selectedTime || "10:00";
      
      setFormData({
        service_id: "",
        appointment_date: date,
        appointment_time: time,
        client_name: "",
        client_phone: "",
        notes: "",
      });
    }
  }, [selectedDate, selectedTime, appointment, open]);

  const loadClients = async () => {
    if (!profileId) return;
    
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("profile_id", profileId)
      .order("name");

    if (!error && data) {
      setClients(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (appointment && onUpdate) {
      onUpdate(appointment.id, formData);
    } else {
      // Save client if new
      if (profileId && formData.client_name && formData.client_phone) {
        const existingClient = clients.find(c => c.phone === formData.client_phone);
        
        if (!existingClient) {
          await supabase.from("clients").insert({
            profile_id: profileId,
            name: formData.client_name,
            phone: formData.client_phone,
          });
        }
      }
      
      onSave(formData);
    }
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (appointment && onDelete) {
      onDelete(appointment.id);
      onOpenChange(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    setFormData({
      ...formData,
      client_name: client.name,
      client_phone: client.phone,
    });
    setSelectClientDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Редактировать запись" : "Создать запись"}
          </DialogTitle>
          {selectedDate && selectedTime && !appointment && (
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "d MMMM", { locale: ru })} {selectedTime}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service">Услуга *</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) =>
                setFormData({ ...formData, service_id: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите услугу" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Дата *</Label>
              <Input
                id="date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Время *</Label>
              <Input
                id="time"
                type="time"
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_time: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_name">Имя клиента *</Label>
            <div className="flex gap-2">
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData({ ...formData, client_name: e.target.value })
                }
                required
                placeholder="Введите имя клиента"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSelectClientDialogOpen(true)}
                title="Выбрать из списка"
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_phone">Телефон *</Label>
            <Input
              id="client_phone"
              type="tel"
              value={formData.client_phone}
              onChange={(e) =>
                setFormData({ ...formData, client_phone: e.target.value })
              }
              required
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Комментарий</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Дополнительная информация"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            {appointment && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                Удалить
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit">
              {appointment ? "Сохранить" : "Создать запись"}
            </Button>
          </DialogFooter>
        </form>

        {/* Client Selection Dialog */}
        <Dialog open={selectClientDialogOpen} onOpenChange={setSelectClientDialogOpen}>
          <DialogContent className="max-w-md max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Выбрать клиента</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[50vh]">
              {clients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Нет сохраненных клиентов
                </p>
              ) : (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectClientDialogOpen(false)}
              >
                Отмена
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
