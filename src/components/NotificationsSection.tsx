import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

export function NotificationsSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Уведомления</h2>
      
      <Card className="p-8 text-center">
        <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          Уведомления будут отображаться здесь
        </p>
      </Card>
    </div>
  );
}
