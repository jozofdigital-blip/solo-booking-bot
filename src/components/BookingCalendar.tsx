import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  appointment_time: string;
  service_name?: string;
  status: string;
}

interface BookingCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date) => void;
}

export const BookingCalendar = ({ appointments, onDateSelect }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const selectedDayAppointments = appointments.filter(apt => {
    if (!selectedDate) return false;
    const aptDate = new Date(apt.appointment_time);
    return format(aptDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-white';
      case 'pending': return 'bg-warning text-white';
      case 'cancelled': return 'bg-destructive text-white';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Календарь</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={ru}
          className="rounded-md border"
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
        </h3>
        
        {selectedDayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            На этот день нет записей
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{apt.client_name}</p>
                    {apt.service_name && (
                      <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(apt.status)}>
                    {apt.status === 'pending' && 'Ожидает'}
                    {apt.status === 'confirmed' && 'Подтверждено'}
                    {apt.status === 'cancelled' && 'Отменено'}
                    {apt.status === 'completed' && 'Завершено'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(apt.appointment_time), 'HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
