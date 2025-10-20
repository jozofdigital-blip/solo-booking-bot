import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

interface Appointment {
  id: string;
  client_name: string;
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

  const getAppointmentsForTimeSlot = (date: Date, hour: number, minute: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointment_time);
      const aptHour = aptDate.getHours();
      const aptMinute = aptDate.getMinutes();
      return isSameDay(aptDate, date) && aptHour === hour && aptMinute === minute;
    });
  };

  const isSlotInWorkingHours = (date: Date, hour: number, minute: number) => {
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success text-white";
      case "pending":
        return "bg-warning text-white";
      case "cancelled":
        return "bg-destructive text-white";
      case "completed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary";
    }
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
        <div className="min-w-[600px] md:min-w-[800px]">
          {/* Header with days */}
          <div className="grid grid-cols-8 border-b bg-muted/50 sticky top-0 z-10">
            <div className="p-2 text-xs md:text-sm font-medium border-r bg-muted/50">Время</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-1 md:p-2 text-center border-r last:border-r-0 bg-muted/50"
              >
                <div className="text-[10px] md:text-xs text-muted-foreground">
                  {format(day, "EEE", { locale: ru })}
                </div>
                <div
                  className={`text-xs md:text-sm font-medium ${
                    isSameDay(day, new Date()) ? "text-telegram" : ""
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
              <div key={`${hour}-${minute}`} className="grid grid-cols-8 min-h-[60px]">
                <div className="p-1 md:p-2 text-[10px] md:text-xs text-muted-foreground border-r flex items-start">
                  {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                </div>
                {weekDays.map((day) => {
                  const slotAppointments = getAppointmentsForTimeSlot(day, hour, minute);
                  const dayOfWeek = (day.getDay() + 6) % 7;
                  const inWorkingHours = isSlotInWorkingHours(day, hour, minute);
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}-${minute}`}
                      className={`p-1 border-r last:border-r-0 relative group ${
                        inWorkingHours 
                          ? "hover:bg-muted/50 cursor-pointer bg-background" 
                          : "bg-muted/20"
                      }`}
                      onClick={() => {
                        if (inWorkingHours) {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                          onDateClick?.(new Date(day));
                        }
                      }}
                    >
                      {slotAppointments.length > 0 ? (
                        <div className="space-y-1">
                          {slotAppointments.map((apt) => {
                            const durationMinutes = apt.duration_minutes || 60;
                            const slotsNeeded = Math.ceil(durationMinutes / 30);
                            
                            return (
                              <div
                                key={apt.id}
                                className="p-1 md:p-2 rounded text-[10px] md:text-xs bg-telegram/10 border border-telegram/20 cursor-pointer hover:bg-telegram/20"
                                style={{ 
                                  minHeight: `${slotsNeeded * 60 - 8}px`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAppointmentClick?.(apt);
                                }}
                              >
                                <div className="font-medium truncate">
                                  {apt.client_name}
                                </div>
                                {apt.service_name && (
                                  <div className="text-muted-foreground truncate text-[9px] md:text-[10px]">
                                    {apt.service_name}
                                  </div>
                                )}
                                <Badge
                                  className={`${getStatusColor(apt.status)} text-[8px] md:text-[10px] mt-1`}
                                  variant="secondary"
                                >
                                  {apt.status === "pending" && "Ожид."}
                                  {apt.status === "confirmed" && "Подтв."}
                                  {apt.status === "cancelled" && "Отм."}
                                  {apt.status === "completed" && "Зав."}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        inWorkingHours && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">
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
                        )
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
