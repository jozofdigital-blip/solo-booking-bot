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
}

interface WeekCalendarProps {
  appointments: Appointment[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onCreateAppointment?: (date: Date) => void;
}

export const WeekCalendar = ({
  appointments,
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

  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

  const getAppointmentsForDateTime = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointment_time);
      const aptHour = aptDate.getHours();
      return isSameDay(aptDate, date) && aptHour === hour;
    });
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
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">
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
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="grid grid-cols-8 border-b bg-muted/50">
            <div className="p-2 text-sm font-medium border-r">Время</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="p-2 text-center border-r last:border-r-0"
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE", { locale: ru })}
                </div>
                <div
                  className={`text-sm font-medium ${
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
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                <div className="p-2 text-xs text-muted-foreground border-r flex items-start">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDateTime(day, hour);
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="p-1 border-r last:border-r-0 hover:bg-muted/50 cursor-pointer relative group"
                      onClick={() => onDateClick?.(new Date(day.setHours(hour, 0, 0, 0)))}
                    >
                      {dayAppointments.length > 0 ? (
                        <div className="space-y-1">
                          {dayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="p-2 rounded text-xs bg-telegram/10 border border-telegram/20 cursor-pointer hover:bg-telegram/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick?.(apt);
                              }}
                            >
                              <div className="font-medium truncate">
                                {apt.client_name}
                              </div>
                              {apt.service_name && (
                                <div className="text-muted-foreground truncate">
                                  {apt.service_name}
                                </div>
                              )}
                              <Badge
                                className={`${getStatusColor(apt.status)} text-[10px] mt-1`}
                                variant="secondary"
                              >
                                {apt.status === "pending" && "Ожидает"}
                                {apt.status === "confirmed" && "Подтв."}
                                {apt.status === "cancelled" && "Отмен."}
                                {apt.status === "completed" && "Завер."}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateAppointment?.(new Date(day.setHours(hour, 0, 0, 0)));
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
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
}