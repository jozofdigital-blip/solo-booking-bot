import { useState } from "react";
import { format, addDays, startOfDay, isBefore, isToday, isSameDay, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Appointment {
  id: string;
  client_name: string;
  appointment_time?: string;
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
}

export const ThreeDayCalendar = ({
  appointments,
  workingHours,
  onAppointmentClick,
  onCreateAppointment,
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

  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter((apt) => {
      if (apt.appointment_date !== dateStr) return false;
      if (!apt.appointment_time) return false;

      const aptTime = apt.appointment_time.substring(0, 5);
      const slotTime = time;

      if (aptTime === slotTime) return true;

      if (apt.duration_minutes) {
        const aptDate = parse(aptTime, 'HH:mm', new Date());
        const slotDate = parse(slotTime, 'HH:mm', new Date());
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const handlePrevDay = () => {
    setCurrentDayStart(addDays(currentDayStart, -1));
  };

  const handleNextDay = () => {
    setCurrentDayStart(addDays(currentDayStart, 1));
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
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {format(currentDayStart, "d MMM", { locale: ru })} -{" "}
            {format(threeDays[2], "d MMM yyyy", { locale: ru })}
          </span>
          {!isToday(currentDayStart) && (
            <Button variant="outline" size="sm" onClick={handleToday}>
              Сегодня
            </Button>
          )}
        </div>
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
            <div key={time} className="grid grid-cols-[60px_1fr_1fr_1fr] border-t">
              <div className="p-2 text-xs text-muted-foreground border-r flex items-start">
                {time}
              </div>
              {threeDays.map((day) => {
                const dayAppointments = getAppointmentsForTimeSlot(day, time);
                const isWorking = isSlotInWorkingHours(day, time);
                const isPast = isSlotPast(day, time);
                const isFirstSlotOfAppointment =
                  dayAppointments.length > 0 &&
                  dayAppointments[0].appointment_time &&
                  dayAppointments[0].appointment_time.substring(0, 5) === time;

                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className={`relative min-h-[60px] p-2 border-r last:border-r-0 ${
                      !isWorking ? "bg-muted" : isPast ? "bg-gray-100" : "bg-background hover:bg-accent cursor-pointer"
                    } ${idx % 2 === 1 ? "border-t-dashed" : ""}`}
                    onClick={() => {
                      if (isWorking && !isPast && dayAppointments.length === 0 && onCreateAppointment) {
                        onCreateAppointment(format(day, "yyyy-MM-dd"), time);
                      }
                    }}
                  >
                    {!isWorking && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    
                    {isWorking && !isPast && dayAppointments.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {isFirstSlotOfAppointment && dayAppointments[0] && (
                      <div
                        className="absolute inset-0 p-1 text-xs overflow-hidden cursor-pointer"
                        style={{
                          height: dayAppointments[0].duration_minutes 
                            ? `${(dayAppointments[0].duration_minutes / 30) * 60}px`
                            : "60px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAppointmentClick) {
                            onAppointmentClick(dayAppointments[0]);
                          }
                        }}
                      >
                        <div className={`h-full rounded p-1 flex flex-col justify-between ${
                          isPast 
                            ? "bg-gray-200 border-l-4 border-gray-400" 
                            : "bg-primary/10 border-l-4 border-primary"
                        }`}>
                          <div>
                            <div className={`font-medium truncate text-xs ${isPast ? "text-gray-500" : ""}`}>
                              {dayAppointments[0].client_name}
                            </div>
                            {dayAppointments[0].service_name && (
                              <div className={`text-xs truncate ${isPast ? "text-gray-400" : "text-muted-foreground"}`}>
                                {dayAppointments[0].service_name}
                              </div>
                            )}
                          </div>
                          <Badge className={`text-xs w-fit ${
                            isPast 
                              ? "bg-gray-400 text-gray-600" 
                              : getStatusColor(dayAppointments[0].status) + " text-white"
                          }`}>
                            {dayAppointments[0].status === "confirmed" ? "Подтверждено" : 
                             dayAppointments[0].status === "cancelled" ? "Отменено" : "В ожидании"}
                          </Badge>
                        </div>
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
