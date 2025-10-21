import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: CancelAppointmentDialogProps) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    setShowReasonInput(false);
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setShowReasonInput(false);
    setReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
          <AlertDialogDescription>
            {showReasonInput
              ? "Клиент получит уведомление с указанной причиной отмены."
              : "Хотите указать причину отмены? Клиент ее увидит."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showReasonInput && (
          <div className="space-y-2">
            <Label htmlFor="reason">Причина отмены (необязательно)</Label>
            <Textarea
              id="reason"
              placeholder="Укажите причину отмены..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          {!showReasonInput ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Нет
              </Button>
              <Button variant="outline" onClick={() => setShowReasonInput(true)}>
                Да
              </Button>
              <Button variant="destructive" onClick={() => onConfirm()} disabled={loading}>
                Отменить без причины
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Назад
              </Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
                {loading ? "Отмена..." : "Отменить запись"}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
