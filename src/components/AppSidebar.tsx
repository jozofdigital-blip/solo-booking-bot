import { LogOut, Package, Users, Bell, MapPin } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: "services", title: "Мои услуги", icon: Package },
  { id: "clients", title: "Мои клиенты", icon: Users },
  { id: "notifications", title: "Уведомления", icon: Bell },
  { id: "address", title: "Мой адрес", icon: MapPin },
];

export function AppSidebar({ currentSection, onSectionChange, onLogout }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(item.id)}
                      className={isActive ? "bg-accent text-accent-foreground" : ""}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Выйти</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
