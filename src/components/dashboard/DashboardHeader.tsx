import { Bell, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threats, assets..."
            className="w-64 pl-9 bg-secondary border-border h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
