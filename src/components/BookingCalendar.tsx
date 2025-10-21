import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  service_name?: string;
  status: string;
}

interface BookingCalendarProps {
  appointments: Appointment[];
  onDateSelect?: (date: Date) => void;
  workingHours?: WorkingHour[];
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export const BookingCalendar = ({ appointments, onDateSelect, workingHours }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const isDayBlocked = (date: Date) => {
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find(wh => wh.day_of_week === dayOfWeek);
    return !workingDay?.is_working;
  };

  const isDayFull = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
    
    if (!workingDay) return false;
    
    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const startMinute = parseInt(workingDay.start_time.split(':')[1]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    const endMinute = parseInt(workingDay.end_time.split(':')[1]);
    
    const totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const totalSlots = Math.floor(totalMinutes / 30);
    
    const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
    const bookedSlots = dayAppointments.length;
    
    return bookedSlots >= totalSlots;
  };

  const selectedDayAppointments = appointments.filter(apt => {
    if (!selectedDate) return false;
    return apt.appointment_date === format(selectedDate, 'yyyy-MM-dd');
  });

  const isAppointmentPast = (aptDate: string, aptTime: string) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${aptDate}T${aptTime}`);
    return isBefore(appointmentDateTime, now);
  };

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
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      <Card className="p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Календарь</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={ru}
          className="rounded-md border w-full mx-auto"
          disabled={(date) => {
            const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
            const isBlocked = isDayBlocked(date);
            const isFull = isDayFull(date);
            return isPast || isBlocked || isFull;
          }}
          modifiers={{
            blocked: (date) => isDayBlocked(date) && !isBefore(startOfDay(date), startOfDay(new Date())),
            full: (date) => isDayFull(date) && !isBefore(startOfDay(date), startOfDay(new Date()))
          }}
          modifiersClassNames={{
            blocked: "bg-muted text-muted-foreground opacity-50",
            full: "bg-muted text-muted-foreground opacity-50"
          }}
        />
      </Card>

      <Card className="p-3 md:p-6">
        <div className="mb-4">
          <h3 className="text-base md:text-lg font-semibold">
            {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
          </h3>
        </div>
        
        {selectedDayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            На этот день нет записей
          </p>
        ) : (
          <div className="space-y-3">
            {selectedDayAppointments.map((apt) => {
              const isPast = isAppointmentPast(apt.appointment_date, apt.appointment_time);
              return (
                <div
                  key={apt.id}
                  className={`p-3 md:p-4 rounded-lg border transition-shadow ${
                    isPast 
                      ? "bg-gray-100 border-gray-300" 
                      : "bg-card hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className={`font-medium text-sm md:text-base ${isPast ? "text-gray-500" : ""}`}>
                        {apt.client_name}
                      </p>
                      {apt.service_name && (
                        <p className={`text-xs md:text-sm ${isPast ? "text-gray-400" : "text-muted-foreground"}`}>
                          {apt.service_name}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-xs ${
                      isPast 
                        ? "bg-gray-400 text-gray-600" 
                        : getStatusColor(apt.status)
                    }`}>
                      {isPast && 'Завершено'}
                      {!isPast && apt.status === 'pending' && 'Ожидает'}
                      {!isPast && apt.status === 'confirmed' && 'Подтверждено'}
                      {!isPast && apt.status === 'cancelled' && 'Отменено'}
                      {!isPast && apt.status === 'completed' && 'Завершено'}
                    </Badge>
                  </div>
                  <p className={`text-xs md:text-sm ${isPast ? "text-gray-400" : "text-muted-foreground"}`}>
                    {apt.appointment_time.substring(0, 5)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
