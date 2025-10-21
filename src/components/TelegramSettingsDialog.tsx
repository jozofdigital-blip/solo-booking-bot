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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ExternalLink } from "lucide-react";

interface TelegramSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChatId?: string;
  profileId: string;
}

export const TelegramSettingsDialog = ({
  open,
  onOpenChange,
  currentChatId,
  profileId,
}: TelegramSettingsDialogProps) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!currentChatId);
  }, [currentChatId, open]);

  const handleEnableNotifications = () => {
    const botUsername = "looktime_app_bot";
    const deeplink = `https://t.me/${botUsername}?start=connect_${profileId}`;
    window.open(deeplink, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Уведомления в Telegram</DialogTitle>
          <DialogDescription>
            Получайте уведомления о новых записях и отменах
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Вы будете получать уведомления о каждой новой записи и отмене с возможностью быстро перейти в календарь
            </AlertDescription>
          </Alert>

          {isConnected ? (
            <Alert className="bg-success/10 border-success">
              <Info className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs text-success">
                ✅ Уведомления подключены и работают
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                После нажатия кнопки откроется Telegram бот. Нажмите "Старт" для подключения уведомлений
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
              Закрыть
            </Button>
            {!isConnected && (
              <Button 
                onClick={handleEnableNotifications}
                className="bg-telegram hover:bg-telegram/90 w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Включить уведомления
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
