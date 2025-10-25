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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
  const [notify24h, setNotify24h] = useState(false);
  const [notify1h, setNotify1h] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsConnected(!!currentChatId);
    if (open) {
      loadNotificationSettings();
      // Ensure Telegram webhooks are configured (owner and client) before connecting
      if (!currentChatId) {
        supabase.functions
          .invoke('setup-telegram-webhook')
          .catch((e) => console.warn('Webhook setup skipped/failed:', e?.message || e));
      }
    }
  }, [currentChatId, open]);

  const loadNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notify_24h_before, notify_1h_before')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      
      if (data) {
        setNotify24h(data.notify_24h_before ?? false);
        setNotify1h(data.notify_1h_before ?? false);
      }
    } catch (error) {
      // Silent fail - use defaults
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notify_24h_before: notify24h,
          notify_1h_before: notify1h,
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success('Настройки сохранены');
      onOpenChange(false);
    } catch (error) {
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_chat_id: null,
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success('Уведомления отключены');
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      toast.error('Ошибка при отключении уведомлений');
    } finally {
      setLoading(false);
    }
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
          {isConnected ? (
            <>
              <Alert className="bg-success/10 border-success">
                <Info className="h-4 w-4 text-success" />
                <AlertDescription className="text-xs text-success">
                  ✅ Уведомления подключены и работают
                </AlertDescription>
              </Alert>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">
                  Когда уведомлять клиента о предстоящей записи?
                </Label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify24h"
                      checked={notify24h}
                      onCheckedChange={(checked) => setNotify24h(checked as boolean)}
                    />
                    <Label
                      htmlFor="notify24h"
                      className="text-sm font-normal cursor-pointer"
                    >
                      За 24 часа
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify1h"
                      checked={notify1h}
                      onCheckedChange={(checked) => setNotify1h(checked as boolean)}
                    />
                    <Label
                      htmlFor="notify1h"
                      className="text-sm font-normal cursor-pointer"
                    >
                      За 1 час
                    </Label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Button 
                asChild
                className="bg-telegram hover:bg-telegram/90 w-full"
              >
                <a
                  href={`https://t.me/looktime_app_bot?start=connect_${profileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Включить уведомления
                </a>
              </Button>
            </>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isConnected ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {loading ? 'Отключение...' : 'Отключить уведомления'}
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={loading || (!notify24h && !notify1h)}
                  className="bg-telegram hover:bg-telegram/90 w-full sm:w-auto"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
