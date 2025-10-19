import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

interface ClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
}

export const ClientsDialog = ({
  open,
  onOpenChange,
  profileId,
}: ClientsDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open, profileId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', profileId)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      toast.error('Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
          })
          .eq('id', editingClient.id);

        if (error) throw error;
        toast.success('Клиент обновлен');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({
            profile_id: profileId,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
          });

        if (error) throw error;
        toast.success('Клиент добавлен');
      }

      setFormData({ name: "", phone: "" });
      setShowAddForm(false);
      setEditingClient(null);
      loadClients();
    } catch (error: any) {
      console.error('Error saving client:', error);
      if (error.code === '23505') {
        toast.error('Клиент с таким номером уже существует');
      } else {
        toast.error('Ошибка сохранения клиента');
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Удалить клиента?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      toast.success('Клиент удален');
      loadClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error('Ошибка удаления клиента');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setFormData({ name: "", phone: "" });
    setShowAddForm(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Мои клиенты</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Add Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по имени или телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-telegram hover:bg-telegram/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card className="p-4 border-telegram/20">
              <div className="space-y-4">
                <h3 className="font-medium">
                  {editingClient ? 'Редактировать клиента' : 'Добавить клиента'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_name">ФИО *</Label>
                    <Input
                      id="client_name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Иван Иванов"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_phone">Телефон *</Label>
                    <Input
                      id="client_phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveClient}
                    className="bg-telegram hover:bg-telegram/90"
                  >
                    {editingClient ? 'Сохранить' : 'Добавить'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Отмена
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Clients List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Загрузка...
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'Клиенты не найдены' : 'Нет клиентов'}
              </div>
            ) : (
              filteredClients.map((client) => (
                <Card key={client.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClient(client)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Stats */}
          {clients.length > 0 && (
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              Всего клиентов: {clients.length}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};