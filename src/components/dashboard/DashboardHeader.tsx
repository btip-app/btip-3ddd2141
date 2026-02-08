import { Bell, Search, Terminal } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        
        {/* Breadcrumb / Context */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span>btip://operations</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search operations..."
            className="w-48 pl-8 bg-secondary border-border h-8 text-xs font-mono"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-destructive rounded-full" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block font-mono">
            {user?.email?.split('@')[0] || 'user'}
          </span>
        </div>
      </div>
    </header>
  );
}
