import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Edit, Trash2, Plus } from "lucide-react";
import { useState } from "react";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

interface ServicesListProps {
  services: Service[];
  onEdit?: (service: Service) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
}

export const ServicesList = ({ services, onEdit, onDelete, onAdd }: ServicesListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (serviceToDelete && onDelete) {
      onDelete(serviceToDelete);
    }
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Услуги</h2>
        {onAdd && (
          <Button onClick={onAdd} className="bg-telegram hover:bg-telegram/90">
            <Plus className="w-4 h-4 mr-2" />
            Добавить услугу
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">У вас пока нет услуг</p>
            {onAdd && (
              <Button onClick={onAdd} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Добавить первую услугу
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="p-6 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {service.description}
                    </p>
                  )}
                </div>
                {!service.is_active && (
                  <Badge variant="secondary" className="ml-2">
                    Неактивно
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Длительность:</span>
                  <span className="ml-1 font-medium">{service.duration_minutes} мин</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Цена:</span>
                  <span className="ml-1 font-medium">{service.price} ₽</span>
                </div>
              </div>

              <div className="flex gap-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(service)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Изменить
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(service.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить услугу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Услуга будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
