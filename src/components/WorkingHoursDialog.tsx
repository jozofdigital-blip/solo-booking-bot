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
import { Switch } from "@/components/ui/switch";

interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

interface WorkingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (hours: WorkingHour[]) => void;
  workingHours: WorkingHour[];
}

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const WorkingHoursDialog = ({
  open,
  onOpenChange,
  onSave,
  workingHours,
}: WorkingHoursDialogProps) => {
  const [hours, setHours] = useState<WorkingHour[]>([]);

  useEffect(() => {
    if (workingHours.length > 0) {
      setHours(workingHours);
    } else {
      // Default working hours
      setHours(
        Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          start_time: i < 5 ? "09:00" : "10:00",
          end_time: i < 5 ? "18:00" : "16:00",
          is_working: i < 6, // Пн-Сб работаем, Вс выходной
        }))
      );
    }
  }, [workingHours, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(hours);
    onOpenChange(false);
  };

  const updateDay = (index: number, updates: Partial<WorkingHour>) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, ...updates } : h))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>График работы</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hours.map((hour, index) => (
            <div
              key={hour.day_of_week}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card"
            >
              <div className="w-12 font-medium">{DAYS[hour.day_of_week]}</div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={hour.is_working}
                  onCheckedChange={(checked) =>
                    updateDay(index, { is_working: checked })
                  }
                />
              </div>

              {hour.is_working && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hour.start_time}
                      onChange={(e) =>
                        updateDay(index, { start_time: e.target.value })
                      }
                      className="w-24"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={hour.end_time}
                      onChange={(e) =>
                        updateDay(index, { end_time: e.target.value })
                      }
                      className="w-24"
                    />
                  </div>
                </>
              )}

              {!hour.is_working && (
                <span className="text-sm text-muted-foreground">Выходной</span>
              )}
            </div>
          ))}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" className="bg-telegram hover:bg-telegram/90">
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}