import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { TelegramSettingsDialog } from "./TelegramSettingsDialog";

interface NotificationsSectionProps {
  profileId: string;
  telegramChatId?: string;
}

export function NotificationsSection({ profileId, telegramChatId }: NotificationsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleConnect = () => {
    const botUsername = "looktime_app_bot";
    const payload = `connect_${profileId}`;
    const tgLink = `tg://resolve?domain=${botUsername}&start=${payload}`;
    // Open directly in Telegram app (no extra windows)
    window.location.href = tgLink;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Уведомления</h2>
      
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-telegram/10">
            <Bell className="w-6 h-6 text-telegram" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-2">Telegram уведомления</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Получайте мгновенные уведомления о новых записях и отменах прямо в Telegram
            </p>
            {telegramChatId ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-success/10 text-success text-sm">
                  ✅ Подключено
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  Настроить
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect}>
                Подключить Telegram
              </Button>
            )}
          </div>
        </div>
      </Card>

      <TelegramSettingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentChatId={telegramChatId}
        profileId={profileId}
      />
    </div>
  );
}
