import { useState, useMemo } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import {
  REGIONS,
  getCountriesForRegion,
  getSubdivisionsForCountry,
  getSubdivisionTerm,
} from '@/data/geography';

const CATEGORIES = [
  { value: 'armed-conflict', label: 'Armed Conflict' },
  { value: 'terrorism', label: 'Terrorism' },
  { value: 'civil-unrest', label: 'Civil Unrest' },
  { value: 'crime', label: 'Crime / Lawlessness' },
  { value: 'political-instability', label: 'Political Instability' },
  { value: 'piracy', label: 'Piracy / Maritime' },
  { value: 'kidnapping', label: 'Kidnapping' },
  { value: 'cyber-attack', label: 'Cyber Attack' },
  { value: 'natural-disaster', label: 'Natural Disaster' },
];

const incidentSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  location: z.string().trim().min(2, 'Location is required').max(100),
  severity: z.number().int().min(1).max(5),
  confidence: z.number().int().min(0).max(100),
  status: z.enum(['ai', 'reviewed', 'confirmed']),
  category: z.string().min(1, 'Category is required'),
  region: z.string().min(1, 'Region is required'),
  country: z.string().min(1, 'Country is required'),
  subdivision: z.string().optional(),
  summary: z.string().trim().max(2000).optional(),
  sources: z.string().optional(),
  analyst: z.string().trim().max(100).optional(),
  section: z.enum(['top_threats', 'trending']),
});

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateIncidentDialog({ open, onOpenChange }: CreateIncidentDialogProps) {
  const { user } = useAuth();
  const { log: auditLog } = useAuditLog();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('3');
  const [confidence, setConfidence] = useState('70');
  const [status, setStatus] = useState<string>('ai');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [subdivision, setSubdivision] = useState('');
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [section, setSection] = useState<string>('top_threats');

  const countries = useMemo(() => (region ? getCountriesForRegion(region) : []), [region]);
  const subdivisions = useMemo(() => (country ? getSubdivisionsForCountry(country) : []), [country]);
  const subdivisionLabel = useMemo(() => (country ? getSubdivisionTerm(country) : 'Subdivision'), [country]);

  const resetForm = () => {
    setTitle(''); setLocation(''); setSeverity('3'); setConfidence('70');
    setStatus('ai'); setCategory(''); setRegion(''); setCountry('');
    setSubdivision(''); setSummary(''); setSources(''); setAnalyst('');
    setSection('top_threats'); setErrors({});
  };

  const handleRegionChange = (v: string) => { setRegion(v); setCountry(''); setSubdivision(''); };
  const handleCountryChange = (v: string) => { setCountry(v); setSubdivision(''); };

  const handleSubmit = async () => {
    const parsed = incidentSchema.safeParse({
      title, location,
      severity: parseInt(severity),
      confidence: parseInt(confidence),
      status, category, region, country,
      subdivision: subdivision || undefined,
      summary: summary || undefined,
      sources: sources || undefined,
      analyst: analyst || undefined,
      section,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const sourcesArray = sources.trim()
      ? sources.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const { error } = await supabase.from('incidents').insert({
      title: parsed.data.title,
      location: parsed.data.location,
      severity: parsed.data.severity,
      confidence: parsed.data.confidence,
      status: parsed.data.status,
      category: parsed.data.category,
      region: parsed.data.region,
      country: parsed.data.country,
      subdivision: parsed.data.subdivision || null,
      summary: parsed.data.summary || null,
      sources: sourcesArray,
      analyst: parsed.data.analyst || null,
      section: parsed.data.section,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to create incident', { description: error.message });
    } else {
      auditLog('INCIDENT_CREATE', parsed.data.title);
      toast.success('Incident created', { description: parsed.data.title });
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            CREATE INCIDENT
          </DialogTitle>
          <DialogDescription className="text-[10px] font-mono text-muted-foreground">
            Submit a new intelligence incident to the operational feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <Field label="Title" error={errors.title}>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief incident title" className="h-8 text-xs font-mono bg-secondary border-border" />
          </Field>

          {/* Location + Category */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" error={errors.location}>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria" className="h-8 text-xs font-mono bg-secondary border-border" />
            </Field>
            <Field label="Category" error={errors.category}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs font-mono">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Geo selectors */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Region" error={errors.region}>
              <Select value={region} onValueChange={handleRegionChange}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {REGIONS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs font-mono">{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Country" error={errors.country}>
              <Select value={country} onValueChange={handleCountryChange} disabled={!region}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {countries.map(c => <SelectItem key={c.value} value={c.value} className="text-xs font-mono">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {country && subdivisions.length > 0 && (
              <Field label={subdivisionLabel}>
                <Select value={subdivision} onValueChange={setSubdivision}>
                  <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {subdivisions.map(s => <SelectItem key={s.value} value={s.value} className="text-xs font-mono">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          {/* Severity, Confidence, Status */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Severity (1-5)" error={errors.severity}>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={String(v)} className="text-xs font-mono">SEV-{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Confidence (%)" error={errors.confidence}>
              <Input type="number" min={0} max={100} value={confidence} onChange={e => setConfidence(e.target.value)} className="h-8 text-xs font-mono bg-secondary border-border" />
            </Field>
            <Field label="Validation Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="ai" className="text-xs font-mono">AI</SelectItem>
                  <SelectItem value="reviewed" className="text-xs font-mono">Reviewed</SelectItem>
                  <SelectItem value="confirmed" className="text-xs font-mono">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Section + Analyst */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Feed Section">
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="top_threats" className="text-xs font-mono">Top Threats</SelectItem>
                  <SelectItem value="trending" className="text-xs font-mono">Trending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Analyst">
              <Input value={analyst} onChange={e => setAnalyst(e.target.value)} placeholder="Analyst name" className="h-8 text-xs font-mono bg-secondary border-border" />
            </Field>
          </div>

          {/* Summary */}
          <Field label="Intelligence Summary">
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Detailed incident summary..." className="text-xs font-mono bg-secondary border-border min-h-[80px]" />
          </Field>

          {/* Sources */}
          <Field label="Sources (comma-separated)">
            <Input value={sources} onChange={e => setSources(e.target.value)} placeholder="e.g. Field Agent, Media, SIGINT" className="h-8 text-xs font-mono bg-secondary border-border" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs font-mono" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Submitting...' : 'Create Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono text-muted-foreground uppercase">{label}</Label>
      {children}
      {error && <p className="text-[10px] font-mono text-destructive">{error}</p>}
    </div>
  );
}
