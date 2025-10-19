import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TelegramSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (chatId: string) => void;
  currentChatId?: string;
}

export const TelegramSettingsDialog = ({
  open,
  onOpenChange,
  onSave,
  currentChatId,
}: TelegramSettingsDialogProps) => {
  const [notificationTime, setNotificationTime] = useState("60");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!currentChatId);
  }, [currentChatId, open]);

  const handleEnableNotifications = () => {
    const botUsername = "looktime24_bot";
    const deeplink = `https://t.me/${botUsername}?start=notify_${notificationTime}`;
    window.open(deeplink, '_blank');
    
    // Show instructions to user
    setTimeout(() => {
      alert('После нажатия "Старт" в боте, уведомления будут активированы автоматически!');
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEnableNotifications();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Уведомления в Telegram</DialogTitle>
          <DialogDescription>
            Настройте автоматические уведомления о записях
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Бот будет отправлять уведомления клиентам о предстоящих записях
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="notification_time">Когда отправлять уведомление</Label>
            <Select value={notificationTime} onValueChange={setNotificationTime}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">За 1 час</SelectItem>
                <SelectItem value="120">За 2 часа</SelectItem>
                <SelectItem value="1440">За 24 часа</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isConnected && (
            <Alert className="bg-success/10 border-success">
              <Info className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs text-success">
                Уведомления подключены и работают
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              className="bg-telegram hover:bg-telegram/90 w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Включить уведомления
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
