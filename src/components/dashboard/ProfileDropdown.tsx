import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { LogOut, User, Settings, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'user';
  const initial = displayName.charAt(0).toUpperCase();

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive';
      case 'analyst': return 'bg-primary/20 text-primary';
      case 'operator': return 'bg-amber-500/20 text-amber-400';
      case 'executive': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 pl-2 border-l border-border cursor-pointer hover:opacity-80 transition-opacity focus:outline-none">
          <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
            {initial}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block font-mono">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel className="font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">{displayName}</span>
            <span className="text-[10px] text-muted-foreground font-normal">{user?.email}</span>
            {role && (
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded w-fit mt-1 ${getRoleBadgeColor()}`}>
                {role}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === 'admin' && (
          <DropdownMenuItem
            onClick={() => navigate('/dashboard/admin')}
            className="text-xs font-mono cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 mr-2" />
            Admin Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => navigate('/dashboard/profile')}
          className="text-xs font-mono cursor-pointer"
        >
          <User className="h-3.5 w-3.5 mr-2" />
          Profile & Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/dashboard/brief')}
          className="text-xs font-mono cursor-pointer"
        >
          <Shield className="h-3.5 w-3.5 mr-2" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-xs font-mono cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
