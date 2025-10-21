import { useState } from "react";
import { format, addDays, startOfDay, isBefore, isToday, isSameDay, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { hasEnoughContinuousTime } from "@/lib/utils";

interface Appointment {
  id: string;
  client_name: string;
  appointment_time: string;
  appointment_date: string;
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

interface ThreeDayCalendarProps {
  appointments: Appointment[];
  workingHours: WorkingHour[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateAppointment?: (date: string, time: string) => void;
  minServiceDuration?: number;
  highlightedAppointmentId?: string | null;
  highlightColor?: 'green' | 'red' | null;
  onClearHighlight?: () => void;
}

export const ThreeDayCalendar = ({
  appointments,
  workingHours,
  onAppointmentClick,
  onCreateAppointment,
  minServiceDuration = 60,
  highlightedAppointmentId,
  highlightColor,
  onClearHighlight,
}: ThreeDayCalendarProps) => {
  const [currentDayStart, setCurrentDayStart] = useState(startOfDay(new Date()));

  const threeDays = [0, 1, 2].map((i) => addDays(currentDayStart, i));

  const getWorkingHoursForDay = (date: Date): WorkingHour | null => {
    const dayOfWeek = date.getDay();
    return workingHours.find((wh) => wh.day_of_week === dayOfWeek) || null;
  };

  const getTimeRange = () => {
    const times: string[] = [];
    threeDays.forEach((day) => {
      const wh = getWorkingHoursForDay(day);
      if (wh && wh.is_working) {
        times.push(wh.start_time, wh.end_time);
      }
    });

    if (times.length === 0) return { start: "09:00", end: "18:00" };

    const sortedTimes = times.sort();
    return { start: sortedTimes[0], end: sortedTimes[sortedTimes.length - 1] };
  };

  const timeRange = getTimeRange();
  const startHour = parseInt(timeRange.start.split(":")[0]);
  const endHour = parseInt(timeRange.end.split(":")[0]);
  
  const timeSlots: string[] = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < endHour) {
      timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }

  const isFirstSlotOfAppointment = (date: Date, time: string, appointment: any) => {
    const aptTime = appointment.appointment_time.substring(0, 5);
    return aptTime === time;
  };

  const getAppointmentDurationSlots = (appointment: any) => {
    const duration = appointment.duration_minutes || 60;
    return Math.ceil(duration / 30);
  };

  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter((apt) => {
      if (apt.appointment_date !== dateStr) return false;
      
      const aptTime = apt.appointment_time.substring(0, 5);
      const slotTime = time;
      
      if (aptTime === slotTime) return true;
      
      if (apt.duration_minutes) {
        const aptDate = parse(aptTime, "HH:mm", new Date());
        const slotDate = parse(slotTime, "HH:mm", new Date());
        const aptEndDate = new Date(aptDate.getTime() + apt.duration_minutes * 60000);
        
        return slotDate >= aptDate && slotDate < aptEndDate;
      }
      
      return false;
    });
  };

  const isSlotInWorkingHours = (date: Date, time: string) => {
    const wh = getWorkingHoursForDay(date);
    if (!wh || !wh.is_working) return false;

    const startTime = wh.start_time.substring(0, 5);
    const endTime = wh.end_time.substring(0, 5);

    return time >= startTime && time < endTime;
  };

  const isSlotPast = (date: Date, time: string) => {
    const now = new Date();
    const slotDateTime = parse(time, "HH:mm", date);
    return isBefore(slotDateTime, now);
  };

  const handlePrevDay = () => {
    setCurrentDayStart(addDays(currentDayStart, -3));
  };

  const handleNextDay = () => {
    setCurrentDayStart(addDays(currentDayStart, 3));
  };

  const handleToday = () => {
    setCurrentDayStart(startOfDay(new Date()));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">
          {format(currentDayStart, "d MMMM", { locale: ru })} -{" "}
          {format(threeDays[2], "d MMMM yyyy", { locale: ru })}
        </span>
        <Button variant="outline" size="icon" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr] bg-muted">
          <div className="p-2 border-r" />
          {threeDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${
                isToday(day) ? "bg-primary text-primary-foreground font-semibold" : ""
              }`}
            >
              <div className="text-xs">{format(day, "EEE", { locale: ru })}</div>
              <div className="text-lg">{format(day, "d")}</div>
            </div>
          ))}
        </div>

        <div className="overflow-auto max-h-[600px]">
          {timeSlots.map((time, idx) => (
            <div key={time} className="grid grid-cols-[60px_1fr_1fr_1fr] border-t min-h-[60px]">
              <div className="p-2 text-xs text-muted-foreground border-r flex items-start">
                {time}
              </div>
              {threeDays.map((day) => {
                const dayAppointments = getAppointmentsForTimeSlot(day, time);
                const isWorking = isSlotInWorkingHours(day, time);
                const isPast = isSlotPast(day, time);
                const isOccupied = dayAppointments.length > 0;
                
                const wh = getWorkingHoursForDay(day);
                const workingEndTime = wh?.end_time?.substring(0, 5);
                const hasEnoughTime = hasEnoughContinuousTime(
                  format(day, "yyyy-MM-dd"),
                  time,
                  minServiceDuration,
                  appointments,
                  workingEndTime
                );

                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className={`relative p-2 border-r last:border-r-0 ${
                      !isWorking ? "bg-muted" : isPast || !hasEnoughTime ? "bg-gray-100" : "bg-background hover:bg-accent cursor-pointer"
                    } ${idx % 2 === 1 ? "border-t-dashed" : ""}`}
                    onClick={() => {
                      if (isWorking && !isPast && !isOccupied && hasEnoughTime && onCreateAppointment) {
                        onCreateAppointment(format(day, "yyyy-MM-dd"), time);
                      }
                    }}
                  >
                    {!isWorking && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {dayAppointments.length > 0 && dayAppointments.map((apt) => {
                      if (!isFirstSlotOfAppointment(day, time, apt)) return null;
                      
                      const durationSlots = getAppointmentDurationSlots(apt);
                      const height = durationSlots * 60;
                      const isHighlighted = apt.id === highlightedAppointmentId;
                      
                      return (
                        <div
                          key={apt.id}
                          className={`absolute inset-0 p-2 rounded cursor-pointer z-10 overflow-hidden ${
                            isPast 
                              ? "bg-gray-200 border-l-4 border-gray-400" 
                              : isHighlighted && highlightColor === 'green'
                              ? "bg-telegram-light border-l-4 border-success hover:bg-telegram-light/80 shadow-lg animate-pulse"
                              : isHighlighted && highlightColor === 'red'
                              ? "bg-telegram-light border-l-4 border-destructive hover:bg-telegram-light/80 shadow-lg animate-pulse"
                              : "bg-telegram-light border-l-4 border-telegram hover:bg-telegram-light/80"
                          }`}
                          style={{ height: `${height}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isHighlighted && onClearHighlight) {
                              onClearHighlight();
                            }
                            if (onAppointmentClick) {
                              onAppointmentClick(apt);
                            }
                          }}
                        >
                          {isHighlighted && highlightColor === 'green' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse" />
                          )}
                          <div className={`font-medium text-xs leading-tight ${isPast ? "text-gray-500" : "text-telegram"}`}>
                            {apt.client_name}
                          </div>
                          {apt.service_name && (
                            <div className={`text-xs leading-tight mt-1 ${isPast ? "text-gray-400" : "text-telegram/70"}`}>
                              {apt.service_name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {isWorking && !isPast && !isOccupied && hasEnoughTime && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
