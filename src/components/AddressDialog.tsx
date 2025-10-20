import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAddress?: string;
  onSave: (address: string) => void;
}

export const AddressDialog = ({ open, onOpenChange, currentAddress, onSave }: AddressDialogProps) => {
  const [address, setAddress] = useState(currentAddress || "");

  useEffect(() => {
    setAddress(currentAddress || "");
  }, [currentAddress, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(address);
    onOpenChange(false);
  };

  const handleClear = () => {
    setAddress("");
    onSave("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ваш адрес</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Введите свой адрес, чтобы клиенты всегда помнили куда им приходить. 
              Адрес будет виден в уведомлении клиентам.
            </p>
            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Например: ул. Ленина, д. 10, офис 5"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {currentAddress && (
              <Button type="button" variant="destructive" onClick={handleClear}>
                Удалить
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
