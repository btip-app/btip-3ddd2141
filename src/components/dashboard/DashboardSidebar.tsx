import { 
  FileText, 
  Map, 
  Package,
  Bell, 
  Bot,
  Settings,
  Shield,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const mainNavItems = [
  { title: 'Daily Brief', url: '/dashboard/brief', icon: FileText },
  { title: 'Threat Map', url: '/dashboard/map', icon: Map },
  { title: 'Assets & Routes', url: '/dashboard/assets', icon: Package },
  { title: 'Alerts', url: '/dashboard/alerts', icon: Bell },
  { title: 'Copilot', url: '/dashboard/copilot', icon: Bot },
];

const adminNavItems = [
  { title: 'Admin', url: '/dashboard/admin', icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const { isAdmin, role } = useUserRole();
  const collapsed = state === 'collapsed';

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive';
      case 'analyst': return 'bg-primary/20 text-primary';
      case 'operator': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent>
        {/* Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            {!collapsed && (
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm tracking-tight">BTIP</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">v1.0</span>
              </div>
            )}
          </div>
        </div>

        {/* Role Badge */}
        {!collapsed && role && (
          <div className="px-4 py-2 border-b border-border">
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${getRoleBadgeColor()}`}>
              {role}
            </span>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 text-sm font-mono"
                      activeClassName="bg-secondary text-primary border-l-2 border-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Navigation - Role Gated */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url}
                        className="flex items-center gap-3 text-sm font-mono"
                        activeClassName="bg-secondary text-primary border-l-2 border-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={signOut}
              tooltip="Sign Out"
              className="text-muted-foreground hover:text-destructive font-mono text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
