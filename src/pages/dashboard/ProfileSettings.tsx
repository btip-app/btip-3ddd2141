import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Building2, MapPin, Save, X, Plus } from 'lucide-react';
import { AddRegionDialog, type MonitoredRegion } from '@/components/dashboard/AddRegionDialog';

export default function ProfileSettings() {
  const { user } = useAuth();
  const { role } = useUserRole();

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Monitored regions (stored locally for now, can be persisted later)
  const [monitoredRegions, setMonitoredRegions] = useState<MonitoredRegion[]>(() => {
    const stored = localStorage.getItem(`btip-regions-${user?.id}`);
    if (stored) {
      try { return JSON.parse(stored); } catch { return []; }
    }
    // Default region
    return [{
      id: 'west-africa-ghana-all',
      region: 'west-africa',
      regionLabel: 'West Africa',
      country: 'ghana',
      countryLabel: 'Ghana',
    }];
  });
  const [addRegionOpen, setAddRegionOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, organization')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || '');
        setOrganization(data.organization || '');
      } else {
        setFullName(user.user_metadata?.full_name || '');
      }
      setLoading(false);
    })();
  }, [user]);

  // Persist monitored regions to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`btip-regions-${user.id}`, JSON.stringify(monitoredRegions));
    }
  }, [monitoredRegions, user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        organization,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    
    if (error) {
      toast.error('Failed to save profile', { description: error.message });
    } else {
      toast.success('Profile updated');
    }
    setSaving(false);
  };

  const handleAddRegion = (region: MonitoredRegion) => {
    setMonitoredRegions(prev => [...prev, region]);
    toast.success('Region added', { description: `Now monitoring ${region.countryLabel}` });
  };

  const handleRemoveRegion = (id: string) => {
    setMonitoredRegions(prev => prev.filter(r => r.id !== id));
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive';
      case 'analyst': return 'bg-primary/20 text-primary';
      case 'operator': return 'bg-amber-500/20 text-amber-400';
      case 'executive': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[10px] font-mono text-muted-foreground animate-pulse">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <h1 className="text-lg font-mono font-bold flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Profile & Settings
        </h1>
        <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
          Manage your account details and monitored regions
        </p>
      </div>

      {/* Account Info */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            ACCOUNT DETAILS
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-8 text-xs font-mono bg-secondary border-border"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Email</label>
              <Input
                value={user?.email || ''}
                disabled
                className="h-8 text-xs font-mono bg-secondary/50 border-border text-muted-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Organization
              </label>
              <Input
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="h-8 text-xs font-mono bg-secondary border-border"
                placeholder="Your organization"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Role</label>
              <div className="h-8 flex items-center">
                <Badge className={`text-[10px] font-mono uppercase px-2 py-0.5 ${getRoleBadgeColor()}`}>
                  {role || 'viewer'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button size="sm" className="text-xs font-mono" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monitored Regions */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              MONITORED REGIONS
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-mono h-7"
              onClick={() => setAddRegionOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Region
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {monitoredRegions.length === 0 ? (
            <div className="text-center py-8 text-[10px] font-mono text-muted-foreground">
              No regions monitored. Add a region to see local intelligence in your Daily Brief.
            </div>
          ) : (
            <div className="space-y-2">
              {monitoredRegions.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-secondary/30 border border-border rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-xs font-mono text-foreground">
                      {r.countryLabel}
                      {r.subdivisionLabel && ` • ${r.subdivisionLabel}`}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      [{r.regionLabel}]
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveRegion(r.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddRegionDialog
        open={addRegionOpen}
        onOpenChange={setAddRegionOpen}
        onAdd={handleAddRegion}
        existing={monitoredRegions}
      />
    </div>
  );
}
