import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import {
  REGIONS,
  getCountriesForRegion,
  getSubdivisionsForCountry,
  getSubdivisionTerm,
} from '@/data/geography';

export interface MonitoredRegion {
  id: string;
  region: string;
  regionLabel: string;
  country: string;
  countryLabel: string;
  subdivision?: string;
  subdivisionLabel?: string;
}

interface AddRegionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (region: MonitoredRegion) => void;
  existing: MonitoredRegion[];
}

export function AddRegionDialog({ open, onOpenChange, onAdd, existing }: AddRegionDialogProps) {
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [subdivision, setSubdivision] = useState('');

  const countries = useMemo(() => (region ? getCountriesForRegion(region) : []), [region]);
  const subdivisions = useMemo(() => (country ? getSubdivisionsForCountry(country) : []), [country]);
  const subdivisionLabel = useMemo(() => (country ? getSubdivisionTerm(country) : 'Subdivision'), [country]);

  const regionObj = REGIONS.find(r => r.value === region);
  const countryObj = countries.find(c => c.value === country);
  const subdivisionObj = subdivisions.find(s => s.value === subdivision);

  const handleRegionChange = (v: string) => { setRegion(v); setCountry(''); setSubdivision(''); };
  const handleCountryChange = (v: string) => { setCountry(v); setSubdivision(''); };

  const canAdd = region && country;

  const isDuplicate = existing.some(
    e => e.region === region && e.country === country && (e.subdivision || '') === subdivision
  );

  const handleAdd = () => {
    if (!canAdd || !regionObj || !countryObj) return;
    onAdd({
      id: `${region}-${country}-${subdivision || 'all'}`,
      region,
      regionLabel: regionObj.label,
      country,
      countryLabel: countryObj.label,
      subdivision: subdivision || undefined,
      subdivisionLabel: subdivisionObj?.label,
    });
    setRegion(''); setCountry(''); setSubdivision('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            ADD MONITORED REGION
          </DialogTitle>
          <DialogDescription className="text-[10px] font-mono text-muted-foreground">
            Select a region and country to monitor in your Daily Brief.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Region */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Region</label>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border">
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {REGIONS.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs font-mono">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          {region && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Country</label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border">
                  <SelectValue placeholder="Select country..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {countries.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-xs font-mono">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subdivision (optional) */}
          {country && subdivisions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">{subdivisionLabel} (Optional)</label>
              <Select value={subdivision} onValueChange={setSubdivision}>
                <SelectTrigger className="h-8 text-xs font-mono bg-secondary border-border">
                  <SelectValue placeholder={`All ${subdivisionLabel}s`} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {subdivisions.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs font-mono">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isDuplicate && (
            <p className="text-[10px] font-mono text-destructive">This region is already being monitored.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs font-mono" onClick={handleAdd} disabled={!canAdd || isDuplicate}>
            Add Region
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
