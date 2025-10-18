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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
  const [chatId, setChatId] = useState("");

  useEffect(() => {
    setChatId(currentChatId || "");
  }, [currentChatId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(chatId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки Telegram</DialogTitle>
          <DialogDescription>
            Настройте уведомления о новых записях в Telegram
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Найдите бота @userinfobot в Telegram</li>
                <li>Отправьте ему команду /start</li>
                <li>Скопируйте ваш Chat ID (Id) и вставьте сюда</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="chat_id">Telegram Chat ID</Label>
            <Input
              id="chat_id"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              required
            />
          </div>

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