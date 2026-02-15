import { Terminal, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ProfileDropdown } from './ProfileDropdown';

export function DashboardHeader() {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        {/* Breadcrumb / Context */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span>bastion://operations</span>
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
        <NotificationBell />

        {/* User Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
}
