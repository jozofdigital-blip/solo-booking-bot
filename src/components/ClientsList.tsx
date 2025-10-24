import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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
  notes: string | null;
}

interface ClientWithAppointment extends Client {
  next_appointment?: {
    date: string;
    time: string;
  } | null;
}

interface ClientsListProps {
  profileId: string;
}

export const ClientsList = ({ profileId }: ClientsListProps) => {
  const [clients, setClients] = useState<ClientWithAppointment[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithAppointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithAppointment | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
  }, [profileId]);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("profile_id", profileId)
      .order("name");

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить клиентов",
        variant: "destructive",
      });
      return;
    }

    // Load appointments for each client
    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("client_phone, appointment_date, appointment_time, status")
      .eq("profile_id", profileId)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", new Date().toISOString().split("T")[0])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    // Filter out past appointments for today
    const now = new Date();
    const todayDate = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().substring(0, 8);
    
    const futureAppointments = appointmentsData?.filter((apt) => {
      if (apt.appointment_date > todayDate) return true;
      if (apt.appointment_date === todayDate) {
        return apt.appointment_time > currentTime;
      }
      return false;
    });

    // Merge clients with their next appointments
    const clientsWithAppointments: ClientWithAppointment[] = (data || []).map((client) => {
      // Find the earliest upcoming appointment for this client
      const nextAppointment = futureAppointments?.find((apt) => apt.client_phone === client.phone);
      return {
        ...client,
        next_appointment: nextAppointment
          ? { date: nextAppointment.appointment_date, time: nextAppointment.appointment_time }
          : null,
      };
    });

    setClients(clientsWithAppointments);
    setFilteredClients(clientsWithAppointments);
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

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update({ name: formData.name, phone: formData.phone, notes: formData.notes })
        .eq("id", editingClient.id);

      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось обновить клиента",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase.from("clients").insert({
        profile_id: profileId,
        name: formData.name,
        phone: formData.phone,
        notes: formData.notes,
      });

      if (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось добавить клиента",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Успешно",
      description: editingClient ? "Клиент обновлен" : "Клиент добавлен",
    });

    setIsEditing(false);
    setEditingClient(null);
    setFormData({ name: "", phone: "", notes: "" });
    loadClients();
  };

  const handleEdit = (client: ClientWithAppointment) => {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone, notes: client.notes || "" });
    setIsEditing(true);
  };

  const handleDeleteClick = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    const { error } = await supabase.from("clients").delete().eq("id", clientToDelete);

    if (error) {
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
    setFormData({ name: "", phone: "", notes: "" });
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Мои клиенты</h2>
        
        {!isEditing ? (
          <div className="space-y-4">
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
                <Card
                  key={client.id}
                  className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleEdit(client)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                    {client.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        💬 {client.notes}
                      </p>
                    )}
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
                </Card>
              ))}

              {filteredClients.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {searchQuery ? "Клиенты не найдены" : "У вас пока нет клиентов"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-6">
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
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (XXX) XXX-XX-XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Комментарий (виден только вам)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Добавьте личные заметки о клиенте"
                  rows={3}
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
          </Card>
        )}
      </div>

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
