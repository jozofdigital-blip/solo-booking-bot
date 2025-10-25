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
import { toast } from "sonner";
import { hasAppointmentOverlap } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");

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
        client_phone: "+7",
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

    if (!formData.service_id) {
      toast.error("Выберите услугу");
      return;
    }
    if (!formData.client_name.trim() || !formData.client_phone.trim()) {
      toast.error("Укажите имя и телефон клиента");
      return;
    }

    // Check for appointment overlaps
    if (profileId) {
      const selectedService = services.find(s => s.id === formData.service_id);
      const serviceDuration = selectedService?.duration_minutes || 60;

      // Fetch all appointments for the selected date
      const { data: existingAppointments, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, service_id, services(duration_minutes)")
        .eq("profile_id", profileId)
        .eq("appointment_date", formData.appointment_date)
        .neq("status", "cancelled");

      if (error) {
        toast.error("Ошибка проверки доступности времени");
        return;
      }

      const appointmentsWithDuration = existingAppointments?.map(apt => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        duration_minutes: (apt.services as any)?.duration_minutes || 60
      })) || [];

      const hasOverlap = hasAppointmentOverlap(
        formData.appointment_date,
        formData.appointment_time,
        serviceDuration,
        appointmentsWithDuration,
        appointment?.id // Exclude current appointment if editing
      );

      if (hasOverlap) {
        toast.error("Это время пересекается с другой записью");
        return;
      }
    }
    
    if (appointment && onUpdate) {
      onUpdate(appointment.id, formData);
    } else {
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

  const handleBlockTime = async () => {
    if (!profileId) {
      toast.error("Не удалось определить профиль");
      return;
    }

    try {
      // Find or create a blocking service
      let blockService = services.find(s => s.name === "Блокировка");
      
      if (!blockService) {
        // Create a special blocking service
        const { data: newService, error: serviceError } = await supabase
          .from("services")
          .insert({
            profile_id: profileId,
            name: "Блокировка",
            description: "Служебная услуга для блокировки времени",
            duration_minutes: 30,
            price: 0,
            is_active: false, // Hidden from client view
          })
          .select()
          .single();

        if (serviceError || !newService) {
          toast.error("Не удалось создать услугу блокировки");
          return;
        }
        
        blockService = newService;
      }

      // Create a blocked appointment
      const { error } = await supabase
        .from("appointments")
        .insert({
          profile_id: profileId,
          service_id: blockService.id,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          client_name: "Заблокировано",
          client_phone: "+70000000000",
          status: "blocked",
          notes: "Время заблокировано",
        });

      if (error) {
        console.error("Error blocking time:", error);
        toast.error("Не удалось заблокировать время");
        return;
      }

      toast.success("Время заблокировано на 30 минут");
      onOpenChange(false);
      // Refresh the page to show the blocked slot
      window.location.reload();
    } catch (error) {
      console.error("Error in handleBlockTime:", error);
      toast.error("Произошла ошибка при блокировке времени");
    }
  };

  const handleClientSelect = (client: Client) => {
    setFormData({
      ...formData,
      client_name: client.name,
      client_phone: client.phone,
    });
    setSelectClientDialogOpen(false);
    setSearchQuery(""); // Reset search when closing
  };

  // Filter and sort clients
  const filteredClients = clients
    .filter(client => {
      const query = searchQuery.toLowerCase();
      return (
        client.name.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

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

          {appointment && (
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
          )}

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
              onChange={(e) => {
                let value = e.target.value;
                // Remove all non-digits
                value = value.replace(/\D/g, '');
                // Add +7 prefix if not present
                if (!value.startsWith('7') && value.length > 0) {
                  value = '7' + value;
                }
                if (value.length > 0) {
                  value = '+' + value;
                }
                // Limit to +7 + 10 digits
                if (value.length > 12) {
                  value = value.substring(0, 12);
                }
                setFormData({ ...formData, client_phone: value });
              }}
              required
              placeholder="+79998887766"
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

          <DialogFooter className="flex-row gap-2">
            <Button type="submit" className="flex-1">
              {appointment ? "Сохранить" : "Создать"}
            </Button>
            {!appointment && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBlockTime}
                className="flex-1"
              >
                Заблокировать время
              </Button>
            )}
          </DialogFooter>
        </form>

        {/* Client Selection Dialog */}
        <Dialog open={selectClientDialogOpen} onOpenChange={setSelectClientDialogOpen}>
          <DialogContent 
            className="max-w-md max-h-[70vh]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Выбрать клиента</DialogTitle>
            </DialogHeader>
            
            {/* Search Input */}
            <div className="space-y-2">
              <Input
                placeholder="Поиск по имени или номеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {filteredClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? "Клиенты не найдены" : "Нет сохраненных клиентов"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
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
                onClick={() => {
                  setSelectClientDialogOpen(false);
                  setSearchQuery("");
                }}
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
