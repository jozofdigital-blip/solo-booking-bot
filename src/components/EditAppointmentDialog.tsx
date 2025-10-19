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
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface Appointment {
  id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  notes?: string;
  status: string;
}

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (appointment: {
    id: string;
    service_id: string;
    appointment_date: string;
    appointment_time: string;
    client_name: string;
    client_phone: string;
    notes?: string;
    status: string;
  }) => void;
  onDelete: (appointmentId: string) => void;
  services: Service[];
  appointment: Appointment | null;
  profileId: string;
  workingHours?: WorkingHour[];
}

export const EditAppointmentDialog = ({
  open,
  onOpenChange,
  onSave,
  onDelete,
  services,
  appointment,
  profileId,
  workingHours,
}: EditAppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    service_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "10:00",
    client_name: "",
    client_phone: "",
    notes: "",
    status: "confirmed",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  useEffect(() => {
    if (appointment) {
      setFormData({
        service_id: appointment.service_id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        client_name: appointment.client_name,
        client_phone: appointment.client_phone,
        notes: appointment.notes || "",
        status: appointment.status,
      });
    }
  }, [appointment]);

  useEffect(() => {
    if (open && profileId) {
      loadClients();
    }
  }, [open, profileId]);

  useEffect(() => {
    if (formData.client_name) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(formData.client_name.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientSuggestions(filtered.length > 0 && formData.client_name.length > 0);
    } else {
      setFilteredClients([]);
      setShowClientSuggestions(false);
    }
  }, [formData.client_name, clients]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profileId)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment) return;

    // Save client if new
    if (formData.client_name && formData.client_phone) {
      const existingClient = clients.find(c => c.phone === formData.client_phone);
      if (!existingClient) {
        try {
          await supabase
            .from('clients')
            .insert({
              profile_id: profileId,
              name: formData.client_name.trim(),
              phone: formData.client_phone.trim(),
            });
        } catch (error) {
          console.error('Error saving client:', error);
        }
      }
    }
    
    onSave({
      id: appointment.id,
      ...formData,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!appointment) return;
    
    if (confirm('Удалить запись?')) {
      onDelete(appointment.id);
      onOpenChange(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setFormData({
      ...formData,
      client_name: client.name,
      client_phone: client.phone,
    });
    setShowClientSuggestions(false);
  };

  const getWorkingHoursForDate = (date: string) => {
    const selectedDate = new Date(date);
    const dayOfWeek = (selectedDate.getDay() + 6) % 7; // Convert to Monday = 0
    return workingHours?.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать запись</DialogTitle>
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
                min={getWorkingHoursForDate(formData.appointment_date)?.start_time}
                max={getWorkingHoursForDate(formData.appointment_date)?.end_time}
              />
              {getWorkingHoursForDate(formData.appointment_date) && (
                <p className="text-xs text-muted-foreground">
                  Рабочие часы: {getWorkingHoursForDate(formData.appointment_date)?.start_time} - {getWorkingHoursForDate(formData.appointment_date)?.end_time}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="client_name">Имя клиента *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
              required
              placeholder="Введите имя"
              onFocus={() => {
                if (filteredClients.length > 0) {
                  setShowClientSuggestions(true);
                }
              }}
            />
            
            {/* Client suggestions dropdown */}
            {showClientSuggestions && filteredClients.length > 0 && (
              <Card className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border shadow-lg">
                <div className="p-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleSelectClient(client)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
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
            <Label htmlFor="status">Статус</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="confirmed">Подтверждено</SelectItem>
                <SelectItem value="completed">Завершено</SelectItem>
                <SelectItem value="cancelled">Отменено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                className="bg-telegram hover:bg-telegram/90 flex-1 sm:flex-none"
              >
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};