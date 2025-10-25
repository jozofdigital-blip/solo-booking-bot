import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimezoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTimezone?: string;
  onSave: (timezone: string) => void;
}

// Список основных городов России с их часовыми поясами
const RUSSIA_CITIES = [
  { city: "Калининград", timezone: "Europe/Kaliningrad", utc: "UTC+2" },
  { city: "Москва, Санкт-Петербург", timezone: "Europe/Moscow", utc: "UTC+3" },
  { city: "Самара, Ижевск", timezone: "Europe/Samara", utc: "UTC+4" },
  { city: "Екатеринбург, Челябинск, Пермь", timezone: "Asia/Yekaterinburg", utc: "UTC+5" },
  { city: "Омск", timezone: "Asia/Omsk", utc: "UTC+6" },
  { city: "Новосибирск, Красноярск", timezone: "Asia/Krasnoyarsk", utc: "UTC+7" },
  { city: "Иркутск, Улан-Удэ", timezone: "Asia/Irkutsk", utc: "UTC+8" },
  { city: "Якутск, Чита", timezone: "Asia/Yakutsk", utc: "UTC+9" },
  { city: "Владивосток, Хабаровск", timezone: "Asia/Vladivostok", utc: "UTC+10" },
  { city: "Магадан, Сахалин", timezone: "Asia/Magadan", utc: "UTC+11" },
  { city: "Камчатка", timezone: "Asia/Kamchatka", utc: "UTC+12" },
];

export const TimezoneDialog = ({
  open,
  onOpenChange,
  currentTimezone = "Europe/Moscow",
  onSave,
}: TimezoneDialogProps) => {
  const [selectedTimezone, setSelectedTimezone] = useState(currentTimezone);

  const handleSave = () => {
    onSave(selectedTimezone);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Часовой пояс</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Выберите ваш город или регион</Label>
            <Select
              value={selectedTimezone}
              onValueChange={setSelectedTimezone}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите город" />
              </SelectTrigger>
              <SelectContent>
                {RUSSIA_CITIES.map((item) => (
                  <SelectItem key={item.timezone} value={item.timezone}>
                    {item.city} ({item.utc})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Часовой пояс используется для корректного отображения времени записей
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button type="button" onClick={handleSave}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
