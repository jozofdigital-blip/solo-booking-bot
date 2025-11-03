import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Client {
  id: string;
  name: string;
  phone: string;
  last_visit: string | null;
}

interface ClientWithAppointment extends Client {
  next_appointment?: {
    date: string;
    time: string;
  } | null;
}

interface ClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
}

export const ClientsDialog = ({ open, onOpenChange, profileId }: ClientsDialogProps) => {
  const [clients, setClients] = useState<ClientWithAppointment[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithAppointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithAppointment | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "+7" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open, profileId]);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      const data = await apiClient.getClients(profileId);
      setClients(data || []);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить клиентов",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClient) {
        await apiClient.updateClient(editingClient.id, {
          name: formData.name,
          phone: formData.phone,
        });
      } else {
        await apiClient.createClient({
          profile_id: profileId,
          name: formData.name,
          phone: formData.phone,
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: editingClient ? "Не удалось обновить клиента" : "Не удалось добавить клиента",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: editingClient ? "Клиент обновлен" : "Клиент добавлен",
    });

    setIsEditing(false);
    setEditingClient(null);
    setFormData({ name: "", phone: "+7" });
    loadClients();
  };

  const handleEdit = (client: ClientWithAppointment) => {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone });
    setIsEditing(true);
  };

  const handleDeleteClick = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await apiClient.deleteClient(clientToDelete);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить клиента",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: "Клиент удален",
    });

    setDeleteDialogOpen(false);
    setClientToDelete(null);
    loadClients();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingClient(null);
    setFormData({ name: "", phone: "+7" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Мои клиенты</DialogTitle>
          </DialogHeader>

          {!isEditing ? (
            <div className="flex-1 overflow-auto space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени или телефону"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setIsEditing(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>

              <div className="space-y-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleEdit(client)}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.phone}</p>
                      {client.next_appointment ? (
                        <p className="text-xs text-telegram font-medium mt-1">
                          Активная запись:{" "}
                          {format(new Date(client.next_appointment.date), "d MMMM", { locale: ru })}{" "}
                          в {client.next_appointment.time.substring(0, 5)}
                        </p>
                      ) : client.last_visit ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Последний визит:{" "}
                          {format(new Date(client.last_visit), "d MMMM yyyy", { locale: ru })}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Еще не было визитов
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(client.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredClients.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? "Клиенты не найдены" : "У вас пока нет клиентов"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите имя клиента"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
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
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="+79998887766"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button onClick={handleSave}>
                  {editingClient ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Клиент будет удален из вашей базы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
