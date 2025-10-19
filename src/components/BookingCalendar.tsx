import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  appointment_time: string;
  service_name?: string;
  status: string;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface BookingCalendarProps {
  appointments: Appointment[];
  workingHours?: WorkingHour[];
  onDateSelect?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export const BookingCalendar = ({ appointments, workingHours, onDateSelect, onAppointmentClick }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
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

  const isWorkingDay = (date: Date) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
    const workingDay = workingHours?.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
    return !!workingDay;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Календарь</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={ru}
          className="rounded-md border w-full"
          disabled={(date) => !isWorkingDay(date)}
        />
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base md:text-lg font-semibold">
            {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
          </h3>
          {selectedDate && onDateSelect && isWorkingDay(selectedDate) && (
            <Button
              size="sm"
              onClick={() => onDateSelect(selectedDate)}
              className="bg-telegram hover:bg-telegram/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Запись
            </Button>
          )}
        </div>
        
        {!isWorkingDay(selectedDate) ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            Выходной день
          </p>
        ) : selectedDayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            На этот день нет записей
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 md:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onAppointmentClick?.(apt)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm md:text-base">{apt.client_name}</p>
                    {apt.service_name && (
                      <p className="text-xs md:text-sm text-muted-foreground">{apt.service_name}</p>
                    )}
                  </div>
                  <Badge className={`${getStatusColor(apt.status)} text-xs`}>
                    {apt.status === 'pending' && 'Ожидает'}
                    {apt.status === 'confirmed' && 'Подтверждено'}
                    {apt.status === 'cancelled' && 'Отменено'}
                    {apt.status === 'completed' && 'Завершено'}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
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
