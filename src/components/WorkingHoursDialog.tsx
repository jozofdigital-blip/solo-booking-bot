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
import { Switch } from "@/components/ui/switch";

export interface WorkingHour {
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

const DAY_CONFIG = [
  { label: "Пн", value: 1, defaultStart: "09:00", defaultEnd: "18:00", defaultWorking: true },
  { label: "Вт", value: 2, defaultStart: "09:00", defaultEnd: "18:00", defaultWorking: true },
  { label: "Ср", value: 3, defaultStart: "09:00", defaultEnd: "18:00", defaultWorking: true },
  { label: "Чт", value: 4, defaultStart: "09:00", defaultEnd: "18:00", defaultWorking: true },
  { label: "Пт", value: 5, defaultStart: "09:00", defaultEnd: "18:00", defaultWorking: true },
  { label: "Сб", value: 6, defaultStart: "10:00", defaultEnd: "16:00", defaultWorking: true },
  { label: "Вс", value: 0, defaultStart: "10:00", defaultEnd: "16:00", defaultWorking: false },
];

export const DEFAULT_WORKING_HOURS: WorkingHour[] = DAY_CONFIG.map((day) => ({
  day_of_week: day.value,
  start_time: day.defaultStart,
  end_time: day.defaultEnd,
  is_working: day.defaultWorking,
}));

export const WorkingHoursDialog = ({
  open,
  onOpenChange,
  onSave,
  workingHours,
}: WorkingHoursDialogProps) => {
  const [hours, setHours] = useState<WorkingHour[]>([]);

  useEffect(() => {
    setHours(
      DAY_CONFIG.map((day) => {
        const existing = workingHours.find(
          (wh) => wh.day_of_week === day.value
        );

        if (existing) {
          return { ...existing };
        }

        return {
          day_of_week: day.value,
          start_time: day.defaultStart,
          end_time: day.defaultEnd,
          is_working: day.defaultWorking,
        };
      })
    );
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
              <div className="w-12 font-medium">
                {DAY_CONFIG.find((day) => day.value === hour.day_of_week)?.label}
              </div>

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
