import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Bell, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BookingSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientPhone: string;
  botUsername: string;
}

export const BookingSuccessDialog = ({
  open,
  onOpenChange,
  clientPhone,
  botUsername,
}: BookingSuccessDialogProps) => {
  const navigate = useNavigate();

  const handleConnectTelegram = () => {
    // Create deep link for client
    const deepLink = `https://t.me/${botUsername}?start=client_${clientPhone}`;
    window.open(deepLink, '_blank');
  };

  const handleViewAppointments = () => {
    onOpenChange(false);
    navigate('/my-appointments');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Запись успешно создана!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Пожалуйста, подключите уведомления в Telegram, чтобы мы напоминали о записях 😊
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleViewAppointments}
            className="w-full h-12 bg-telegram hover:bg-telegram/90"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Посмотреть мои записи
          </Button>

          <Button
            onClick={handleConnectTelegram}
            variant="outline"
            className="w-full h-12"
          >
            <Bell className="w-5 h-5 mr-2" />
            Подключить уведомления
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
