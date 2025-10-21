import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isBefore, parse } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  service_name?: string;
  status: string;
  duration_minutes?: number;
}

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface WeekCalendarProps {
  appointments: Appointment[];
  workingHours?: WorkingHour[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateAppointment?: (date: string, time: string) => void;
}

export const WeekCalendar = ({
  appointments,
  workingHours,
  onDateClick,
  onAppointmentClick,
  onCreateAppointment,
}: WeekCalendarProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

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

  // Get working hours range
  const getWorkingHoursForDay = (dayOfWeek: number) => {
    const workingDay = workingHours?.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
    if (!workingDay) return { start: 9, end: 18 };
    
    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    return { start: startHour, end: endHour };
  };

  // Get min and max hours from all working days
  const getTimeRange = () => {
    if (!workingHours || workingHours.length === 0) {
      return { minHour: 9, maxHour: 18 };
    }
    
    const workingDays = workingHours.filter(wh => wh.is_working);
    if (workingDays.length === 0) {
      return { minHour: 9, maxHour: 18 };
    }

    const minHour = Math.min(...workingDays.map(wh => parseInt(wh.start_time.split(':')[0])));
    const maxHour = Math.max(...workingDays.map(wh => parseInt(wh.end_time.split(':')[0])));
    
    return { minHour, maxHour };
  };

  const { minHour, maxHour } = getTimeRange();
  
  // Generate 30-minute time slots
  const timeSlots: { hour: number; minute: number }[] = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    timeSlots.push({ hour, minute: 0 });
    if (hour < maxHour) {
      timeSlots.push({ hour, minute: 30 });
    }
  }

  const isFirstSlotOfAppointment = (date: Date, hour: number, minute: number, appointment: any) => {
    const [aptHour, aptMinute] = appointment.appointment_time.split(':').map(Number);
    return aptHour === hour && aptMinute === minute;
  };

  const getAppointmentDurationSlots = (appointment: any) => {
    const duration = appointment.duration_minutes || 60;
    return Math.ceil(duration / 30);
  };

  const getAppointmentsForTimeSlot = (date: Date, hour: number, minute: number) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const slotTime = hour * 60 + minute;
    
    return appointments.filter((apt) => {
      if (apt.appointment_date !== dateStr) return false;
      
      const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
      const aptStartTime = aptHour * 60 + aptMinute;
      const aptDuration = apt.duration_minutes || 60;
      const aptEndTime = aptStartTime + aptDuration;
      
      return slotTime >= aptStartTime && slotTime < aptEndTime;
    });
  };

  const isSlotOccupied = (date: Date, hour: number, minute: number) => {
    return getAppointmentsForTimeSlot(date, hour, minute).length > 0;
  };

  const isSlotInWorkingHours = (date: Date, hour: number, minute: number) => {
    const dayOfWeek = date.getDay();
    const workingDay = workingHours?.find(wh => wh.day_of_week === dayOfWeek && wh.is_working);
    
    if (!workingDay) return false;
    
    const startHour = parseInt(workingDay.start_time.split(':')[0]);
    const startMinute = parseInt(workingDay.start_time.split(':')[1]);
    const endHour = parseInt(workingDay.end_time.split(':')[0]);
    const endMinute = parseInt(workingDay.end_time.split(':')[1]);
    
    const slotTime = hour * 60 + minute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  const isSlotPast = (date: Date, hour: number, minute: number) => {
    const now = new Date();
    const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const slotDateTime = parse(timeStr, "HH:mm", date);
    return isBefore(slotDateTime, now);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm md:text-lg font-semibold">
          {format(currentWeekStart, "d MMM", { locale: ru })} -{" "}
          {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: ru })}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header with days */}
          <div className="grid grid-cols-8 border-b bg-muted/50 sticky top-0 z-10">
            <div className="p-1 md:p-2 text-xs md:text-sm font-medium border-r bg-muted/50 min-w-[50px] flex items-center justify-center">
              Время
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-1 md:p-2 text-center border-r last:border-r-0 flex-1 ${
                  isDayFull(day) && !isBefore(day, new Date()) 
                    ? "bg-muted/70" 
                    : "bg-muted/50"
                }`}
              >
                <div className="text-[10px] md:text-xs text-muted-foreground">
                  {format(day, "EEE", { locale: ru })}
                </div>
                <div
                  className={`text-xs md:text-sm font-medium ${
                    isSameDay(day, new Date()) 
                      ? "text-telegram" 
                      : isDayFull(day) && !isBefore(day, new Date())
                        ? "text-muted-foreground"
                        : ""
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="divide-y">
            {timeSlots.map(({ hour, minute }) => (
              <div key={`${hour}-${minute}`} className="grid grid-cols-8 min-h-[50px]">
                <div className="p-1 md:p-2 text-[10px] md:text-xs text-muted-foreground border-r flex items-start justify-center min-w-[50px]">
                  {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                </div>
                {weekDays.map((day) => {
                  const slotAppointments = getAppointmentsForTimeSlot(day, hour, minute);
                  const inWorkingHours = isSlotInWorkingHours(day, hour, minute);
                  const isPast = isSlotPast(day, hour, minute);
                  const dayFull = isDayFull(day);
                  const isOccupied = slotAppointments.length > 0;
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}-${minute}`}
                      className={`p-1 border-r last:border-r-0 relative flex-1 ${
                        !inWorkingHours 
                          ? "bg-muted/20" 
                          : isPast || dayFull
                            ? "bg-muted/40" 
                            : "hover:bg-muted/50 cursor-pointer bg-background"
                      }`}
                      onClick={() => {
                        if (inWorkingHours && !isPast && !dayFull && !isOccupied) {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                          onCreateAppointment?.(dateStr, timeStr);
                        }
                      }}
                    >
                      {!inWorkingHours && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="h-3 w-3 text-muted-foreground opacity-50" />
                        </div>
                      )}

                      {slotAppointments.length > 0 && slotAppointments.map((apt) => {
                        if (!isFirstSlotOfAppointment(day, hour, minute, apt)) return null;
                        
                        const durationSlots = getAppointmentDurationSlots(apt);
                        const height = durationSlots * 50;
                        
                        return (
                          <div
                            key={apt.id}
                            className={`absolute inset-0 p-1 md:p-2 rounded cursor-pointer z-10 overflow-hidden ${
                              isPast
                                ? "bg-gray-200 border-l-4 border-gray-400"
                                : "bg-telegram border-l-4 border-telegram-dark hover:bg-telegram/90"
                            }`}
                            style={{ height: `${height}px` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick?.(apt);
                            }}
                          >
                            <div className={`font-medium text-[10px] md:text-xs leading-tight ${isPast ? "text-gray-500" : "text-white"}`}>
                              {apt.client_name}
                            </div>
                            {apt.service_name && (
                              <div className={`text-[9px] md:text-[10px] leading-tight mt-0.5 ${
                                isPast ? "text-gray-400" : "text-white/90"
                              }`}>
                                {apt.service_name}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {inWorkingHours && !isPast && !isOccupied && (
                        <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">
                          <Plus 
                            className="w-4 h-4 text-muted-foreground cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dateStr = format(day, "yyyy-MM-dd");
                              const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                              onCreateAppointment?.(dateStr, timeStr);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
