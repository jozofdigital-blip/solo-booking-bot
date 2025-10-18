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

interface Service {
  id: string;
  name: string;
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
    client_telegram?: string;
    notes?: string;
  }) => void;
  services: Service[];
  selectedDate?: Date;
}

export const AppointmentDialog = ({
  open,
  onOpenChange,
  onSave,
  services,
  selectedDate,
}: AppointmentDialogProps) => {
  const [formData, setFormData] = useState({
    service_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    appointment_time: "10:00",
    client_name: "",
    client_phone: "",
    client_telegram: "",
    notes: "",
  });

  useEffect(() => {
    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
      }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) {
      setFormData({
        service_id: "",
        appointment_date: format(new Date(), "yyyy-MM-dd"),
        appointment_time: "10:00",
        client_name: "",
        client_phone: "",
        client_telegram: "",
        notes: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать запись</DialogTitle>
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
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
              required
              placeholder="Введите имя"
            />
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
            <Label htmlFor="client_telegram">Telegram</Label>
            <Input
              id="client_telegram"
              value={formData.client_telegram}
              onChange={(e) =>
                setFormData({ ...formData, client_telegram: e.target.value })
              }
              placeholder="@username"
            />
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" className="bg-telegram hover:bg-telegram/90">
              Создать запись
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}