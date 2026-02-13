import { useState, useEffect, useMemo } from 'react';
import { mapDatabaseError } from '@/lib/errorMessages';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Users, Shield, Loader2, UserPlus, Check, X, Globe, MessageCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { OsintSourcesManager } from '@/components/dashboard/OsintSourcesManager';
import { TelegramChannelsManager } from '@/components/dashboard/TelegramChannelsManager';

interface UserWithRole {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string;
  organization: string | null;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-destructive/20 text-destructive',
  analyst: 'bg-primary/20 text-primary',
  operator: 'bg-amber-500/20 text-amber-400',
  executive: 'bg-blue-500/20 text-blue-400',
  viewer: 'bg-muted text-muted-foreground',
};

const VALID_ROLES = ['admin', 'analyst', 'operator', 'executive', 'viewer'];

export default function Admin() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [credentialsDialog, setCredentialsDialog] = useState<{ email: string; password: string; role: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
    fetchRequests();
  }, [isAdmin]);

  const fetchRequests = async () => {
    setRequestsLoading(true);
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    if (error) console.error('Failed to fetch requests:', error);
    setRequestsLoading(false);
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('approve-user', {
        body: { requestId: id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || 'Approval failed');
      } else {
        setCredentialsDialog({
          email: res.data.email,
          password: res.data.tempPassword,
          role: res.data.role,
        });
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        fetchUsers();
        toast.success('Account created');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setApprovingId(null);
  };

  const handleDeny = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('access_requests')
      .update({ status: 'denied', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error(mapDatabaseError(error));
    } else {
      toast.success('Request denied');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'denied' } : r));
    }
  };

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch roles
    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: true });

    if (rolesErr) {
      console.error('Failed to fetch roles:', rolesErr);
      setLoading(false);
      return;
    }

    // Fetch profiles for names & orgs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, organization');

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    const merged: UserWithRole[] = (roles || []).map(r => {
      const profile = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role,
        full_name: profile?.full_name || null,
        email: r.user_id.slice(0, 8) + '…',
        organization: profile?.organization || null,
        created_at: r.created_at,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update role', { description: mapDatabaseError(error) });
    } else {
      toast.success('Role updated');
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    }
    setUpdatingId(null);
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard/brief" replace />;
  }

  const roleCounts = VALID_ROLES.reduce((acc, role) => {
    acc[role] = users.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<string, number>);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Administration
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            User management & role configuration • {users.length} users registered
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-[9px] font-mono">
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="users" className="text-[10px] font-mono">
            <Users className="h-3 w-3 mr-1" /> Users
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-[10px] font-mono">
            <UserPlus className="h-3 w-3 mr-1" /> Access Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[7px] px-1 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-[10px] font-mono">
            <Globe className="h-3 w-3 mr-1" /> Intel Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          {/* Role summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {VALID_ROLES.map(role => (
              <Card key={role} className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-mono font-bold text-foreground">{roleCounts[role]}</div>
                  <Badge className={`${ROLE_COLORS[role]} text-[9px] font-mono mt-1 uppercase`}>
                    {role}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* User management table */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                USER MANAGEMENT
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[9px] font-mono text-muted-foreground">USER ID</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">NAME</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">ORGANIZATION</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">CURRENT ROLE</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">CHANGE ROLE</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">JOINED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Shield className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground">No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.user_id} className="border-border">
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {user.user_id.slice(0, 12)}…
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-foreground py-2">
                        {user.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {user.organization || '—'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`${ROLE_COLORS[user.role] || ROLE_COLORS.viewer} text-[8px] font-mono uppercase`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user.user_id, v)}
                          disabled={updatingId === user.user_id}
                        >
                          <SelectTrigger className="w-[120px] h-7 text-[10px] font-mono bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {VALID_ROLES.map(r => (
                              <SelectItem key={r} value={r} className="text-[10px] font-mono capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                ACCESS REQUESTS
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[9px] font-mono text-muted-foreground">NAME</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">EMAIL</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">ORG</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">ROLE</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">REASON</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">STATUS</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">DATE</TableHead>
                  <TableHead className="text-[9px] font-mono text-muted-foreground">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <UserPlus className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[10px] font-mono text-muted-foreground">No access requests</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map(req => (
                    <TableRow key={req.id} className="border-border">
                      <TableCell className="text-[10px] font-mono text-foreground py-2">
                        {req.full_name}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {req.email}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {req.organization || '—'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[8px] font-mono uppercase">
                          {req.role_requested}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2 max-w-[150px] truncate">
                        {req.reason || '—'}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[8px] font-mono uppercase ${
                          req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          req.status === 'approved' ? 'bg-primary/20 text-primary' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2">
                      {req.status === 'pending' ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Approve & Create Account"
                              disabled={approvingId === req.id}
                              onClick={() => handleApprove(req.id)}
                            >
                              {approvingId === req.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Deny"
                              onClick={() => handleDeny(req.id)}
                            >
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="sources" className="mt-4 space-y-6">
          <Card className="bg-card border-border p-4">
            <OsintSourcesManager />
          </Card>
          <Card className="bg-card border-border p-4">
            <TelegramChannelsManager />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credentials Dialog */}
      <Dialog open={!!credentialsDialog} onOpenChange={() => { setCredentialsDialog(null); setShowPassword(false); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Account Created
            </DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-muted-foreground">
              Share these credentials securely with the user. The password cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground uppercase">Email</label>
                <div className="flex items-center gap-2 bg-secondary rounded px-3 py-2">
                  <span className="text-xs font-mono text-foreground flex-1">{credentialsDialog.email}</span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => { navigator.clipboard.writeText(credentialsDialog.email); toast.success('Email copied'); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground uppercase">Temporary Password</label>
                <div className="flex items-center gap-2 bg-secondary rounded px-3 py-2">
                  <span className="text-xs font-mono text-foreground flex-1">
                    {showPassword ? credentialsDialog.password : '••••••••••••'}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => { navigator.clipboard.writeText(credentialsDialog.password); toast.success('Password copied'); }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground uppercase">Assigned Role</label>
                <Badge className={`${ROLE_COLORS[credentialsDialog.role] || ROLE_COLORS.viewer} text-[9px] font-mono uppercase`}>
                  {credentialsDialog.role}
                </Badge>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-[9px] font-mono text-amber-300">
                ⚠ This password is shown only once. The user should change it after first login.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
