import { LogOut, Package, Users, Bell, MapPin, Calendar, CalendarCog, Edit3, X, Share2, CreditCard, Copy } from "lucide-react";
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
  userId?: string;
  profileSlug?: string;
}

const navigationItems = [
  { id: "services", title: "Мои услуги", icon: Package },
  { id: "clients", title: "Мои клиенты", icon: Users },
  { id: "notifications", title: "Уведомления", icon: Bell },
  { id: "address", title: "Мои контакты", icon: MapPin },
  { id: "booking-link", title: "Ссылка для клиентов", icon: Share2 },
];

export function AppSidebar({ currentSection, onSectionChange, onLogout, onOpenWorkingHours, onEditBusinessName, onOpenSubscription, daysLeft, isTrial, userId, profileSlug }: AppSidebarProps) {
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
            <SidebarMenu className="space-y-3">
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
                      className={`relative overflow-hidden group transition-all duration-300 ${
                        isActive 
                          ? "bg-gradient-to-r from-primary/20 to-primary/10 border-l-4 border-primary text-primary shadow-md" 
                          : "hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent hover:border-l-4 hover:border-primary/30"
                      }`}
                      >
                        <div className={`flex items-center gap-3 ${isActive ? "scale-105" : ""} transition-transform`}>
                          <div className={`p-2 rounded-lg ${isActive ? "bg-primary/10" : "bg-muted group-hover:bg-primary/5"} transition-colors`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {(!isCollapsed || isMobile) && (
                            <span className="text-base font-medium">{item.title}</span>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50" />
                        )}
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onOpenWorkingHours}
                  className="relative overflow-hidden group hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent hover:border-l-4 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/5 transition-colors">
                      <CalendarCog className="h-5 w-5" />
                    </div>
                    {(!isCollapsed || isMobile) && <span className="text-base font-medium">Мой график</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onEditBusinessName}
                  className="relative overflow-hidden group hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent hover:border-l-4 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/5 transition-colors">
                      <Edit3 className="h-5 w-5" />
                    </div>
                    {(!isCollapsed || isMobile) && <span className="text-base font-medium">Изменить название</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onLogout} 
                  className="relative overflow-hidden group hover:bg-gradient-to-r hover:from-destructive/10 hover:to-transparent hover:border-l-4 hover:border-destructive/30 text-destructive transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-destructive/5 transition-colors">
                      <LogOut className="h-5 w-5" />
                    </div>
                    {(!isCollapsed || isMobile) && <span className="text-base font-medium">Выйти</span>}
                  </div>
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
                  className="w-full justify-center bg-gradient-to-r from-telegram via-telegram to-telegram/80 hover:from-telegram/90 hover:via-telegram/90 hover:to-telegram/70 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  size={isCollapsed ? "icon" : "default"}
                >
                  {(!isCollapsed || isMobile) ? (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Мой тариф</span>
                    </div>
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
            
            {/* Days remaining text */}
            {(!isCollapsed || isMobile) && daysLeft !== null && daysLeft !== undefined && (
              <div className="px-2 pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {isTrial 
                    ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`
                    : `Активен ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`
                  }
                </p>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile ID at the bottom */}
        {(!isCollapsed || isMobile) && profileSlug && (
          <SidebarGroup className="pb-4">
            <SidebarGroupContent>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profileSlug);
                }}
                className="w-full px-3 py-2 flex items-center justify-center gap-2 hover:bg-muted rounded transition-colors cursor-pointer group"
                title="Нажмите, чтобы скопировать ID"
              >
                <p className="text-xs text-muted-foreground font-mono">
                  {profileSlug}
                </p>
                <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
