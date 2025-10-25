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
  { id: "services", title: "Мои услуги", icon: Package, color: "text-telegram" },
  { id: "clients", title: "Мои клиенты", icon: Users, color: "text-telegram" },
  { id: "notifications", title: "Уведомления", icon: Bell, color: "text-telegram" },
  { id: "address", title: "Мои контакты", icon: MapPin, color: "text-telegram" },
  { id: "booking-link", title: "Ссылка для клиентов", icon: Share2, color: "text-telegram" },
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
                      className={`transition-colors ${
                        isActive 
                          ? "bg-muted" 
                          : "hover:bg-muted/50"
                      }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${item.color}`} />
                          {(!isCollapsed || isMobile) && (
                            <span className={`text-base ${isActive ? "font-medium" : ""}`}>{item.title}</span>
                          )}
                        </div>
                      </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onOpenWorkingHours}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CalendarCog className="h-5 w-5 text-telegram" />
                    {(!isCollapsed || isMobile) && <span className="text-base">Мой график</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onEditBusinessName}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Edit3 className="h-5 w-5 text-telegram" />
                    {(!isCollapsed || isMobile) && <span className="text-base">Изменить название</span>}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={onLogout} 
                  className="hover:bg-muted/50 transition-colors text-destructive"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-destructive" />
                    {(!isCollapsed || isMobile) && <span className="text-base">Выйти</span>}
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
                    <span>Мой тариф</span>
                  ) : (
                    <span className="text-xs">Тариф</span>
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
