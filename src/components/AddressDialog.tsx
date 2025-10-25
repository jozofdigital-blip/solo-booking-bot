import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAddress?: string;
  currentPhone?: string;
  onSave: (address: string, phone: string) => void;
}

export const AddressDialog = ({ open, onOpenChange, currentAddress, currentPhone, onSave }: AddressDialogProps) => {
  const [address, setAddress] = useState(currentAddress || "");
  const [phone, setPhone] = useState(currentPhone || "+7");

  useEffect(() => {
    setAddress(currentAddress || "");
    setPhone(currentPhone || "+7");
  }, [currentAddress, currentPhone, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(address, phone);
    onOpenChange(false);
  };

  const handleClear = () => {
    setAddress("");
    setPhone("");
    onSave("", "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Контактная информация</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Укажите свои контактные данные. Клиенты увидят их в своих записях и уведомлениях.
            </p>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  let value = e.target.value;
                  // Remove all non-digits
                  value = value.replace(/\D/g, '');
                  // Add +7 prefix if not present
                  if (!value.startsWith('7') && value.length > 0) {
                    value = '7' + value;
                  }
                  if (value.length > 0) {
                    value = '+' + value;
                  }
                  // Limit to +7 + 10 digits
                  if (value.length > 12) {
                    value = value.substring(0, 12);
                  }
                  setPhone(value);
                }}
                placeholder="+79998887766"
              />
            </div>
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
            {(currentAddress || currentPhone) && (
              <Button type="button" variant="destructive" onClick={handleClear}>
                Удалить всё
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
