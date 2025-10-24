import { LogOut, Package, Users, Bell, MapPin, Calendar, CalendarCog, Edit3, X, Share2, CreditCard } from "lucide-react";
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
  onOpenSubscription: () => void;
  daysLeft?: number | null;
  isTrial?: boolean;
}

const navigationItems = [
  { id: "services", title: "Мои услуги", icon: Package },
  { id: "clients", title: "Мои клиенты", icon: Users },
  { id: "notifications", title: "Уведомления", icon: Bell },
  { id: "address", title: "Мой адрес", icon: MapPin },
  { id: "booking-link", title: "Ссылка для клиентов", icon: Share2 },
];

export function AppSidebar({ currentSection, onSectionChange, onLogout, onOpenWorkingHours, onEditBusinessName, onOpenSubscription, daysLeft, isTrial }: AppSidebarProps) {
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
        {/* Main navigation items */}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription section - highlighted */}
        <SidebarGroup className="mt-auto pt-4 border-t">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Button 
                  onClick={onOpenSubscription}
                  className="w-full justify-start bg-telegram hover:bg-telegram/90 text-white font-semibold"
                  size={isCollapsed ? "icon" : "default"}
                >
                  <CreditCard className="h-4 w-4" />
                  {(!isCollapsed || isMobile) && <span className="ml-2">Мой тариф</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
            
            {/* Days remaining text */}
            {(!isCollapsed || isMobile) && daysLeft !== null && daysLeft !== undefined && (
              <div className="px-2 pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {isTrial 
                    ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`
                    : `Активна ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`
                  }
                </p>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout button */}
        <SidebarGroup className="pb-4">
          <SidebarGroupContent>
            <SidebarMenu>
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
