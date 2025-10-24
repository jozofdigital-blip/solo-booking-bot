import { LogOut, Package, Users, Bell, MapPin, Calendar, CalendarCog, Edit3, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
  onOpenWorkingHours: () => void;
  onEditBusinessName: () => void;
}

const navigationItems = [
  { id: "services", title: "Мои услуги", icon: Package },
  { id: "clients", title: "Мои клиенты", icon: Users },
  { id: "notifications", title: "Уведомления", icon: Bell },
  { id: "address", title: "Мой адрес", icon: MapPin },
  { id: "booking-link", title: "Ссылка для клиентов", icon: Share2 },
];

export function AppSidebar({ currentSection, onSectionChange, onLogout, onOpenWorkingHours, onEditBusinessName }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  return (
    <Sidebar side="right" className={`${isCollapsed ? "w-14" : "w-60"}`}>
      <div className="bg-background h-full border-l">
        {/* Close button at the top */}
        {!isCollapsed && (
          <div className="flex justify-end p-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        onSectionChange(item.id);
                        if (isMobile || !isCollapsed) {
                          toggleSidebar();
                        }
                      }}
                      className={isActive ? "bg-accent text-accent-foreground" : ""}
                    >
                      <Icon className="h-4 w-4" />
                      {(!isCollapsed || isMobile) && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenWorkingHours}>
                  <CalendarCog className="h-4 w-4" />
                  {(!isCollapsed || isMobile) && <span>Мой график</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={onEditBusinessName}>
                  <Edit3 className="h-4 w-4" />
                  {(!isCollapsed || isMobile) && <span>Изменить название</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={onLogout} className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {(!isCollapsed || isMobile) && <span>Выйти</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
