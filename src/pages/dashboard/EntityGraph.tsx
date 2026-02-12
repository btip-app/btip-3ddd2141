import { useState, useMemo } from "react";
import { useEntities, useEntityAliases, useEntityIncidents, useRunEntityExtraction, useMergeEntities } from "@/hooks/useEntities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, Network, Play, ChevronRight, Shield, Building2, User, Swords, Landmark, MapPin, Merge, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  threat_actor: Swords,
  organization: Building2,
  armed_group: Shield,
  government: Landmark,
  person: User,
  location_group: MapPin,
};

const typeColors: Record<string, string> = {
  threat_actor: "bg-red-500/20 text-red-400 border-red-500/30",
  organization: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  armed_group: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  government: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  person: "bg-green-500/20 text-green-400 border-green-500/30",
  location_group: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const roleColors: Record<string, string> = {
  perpetrator: "bg-red-500/20 text-red-300",
  target: "bg-amber-500/20 text-amber-300",
  mentioned: "bg-slate-500/20 text-slate-300",
  affiliated: "bg-cyan-500/20 text-cyan-300",
};

export default function EntityGraph() {
  const { data: entities, isLoading } = useEntities();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const { data: aliases } = useEntityAliases(selectedEntityId);
  const { data: linkedIncidents } = useEntityIncidents(selectedEntityId);
  const extractMutation = useRunEntityExtraction();
  const mergeMutation = useMergeEntities();

  // Merge state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

  const selectedEntity = entities?.find(e => e.id === selectedEntityId);

  const mergeEntities = useMemo(() => {
    if (!entities) return [];
    return entities.filter(e => mergeSelected.includes(e.id));
  }, [entities, mergeSelected]);

  const handleRunExtraction = async () => {
    try {
      const result = await extractMutation.mutateAsync({ limit: 30 });
      toast.success(`Extracted ${result.entities_created} entities, created ${result.links_created} links from ${result.processed} incidents`);
    } catch (e: any) {
      toast.error(e.message || "Extraction failed");
    }
  };

  const handleToggleMergeSelect = (id: string) => {
    setMergeSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleOpenMergeDialog = () => {
    if (mergeSelected.length < 2) {
      toast.error("Select at least 2 entities to merge");
      return;
    }
    // Default target = entity with most incidents
    const sorted = mergeEntities.sort((a, b) => b.incident_count - a.incident_count);
    setMergeTargetId(sorted[0]?.id || "");
    setMergeDialogOpen(true);
  };

  const handleMerge = async () => {
    if (!mergeTargetId) return;
    const sourceIds = mergeSelected.filter(id => id !== mergeTargetId);
    
    try {
      for (const sourceId of sourceIds) {
        const result = await mergeMutation.mutateAsync({ targetId: mergeTargetId, sourceId });
        toast.success(`Merged "${result.source_name}" → "${result.target_name}" (${result.aliases_moved} aliases, ${result.links_moved} links moved)`);
      }
      setMergeSelected([]);
      setMergeMode(false);
      setMergeDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Merge failed");
    }
  };

  const stats = {
    total: entities?.length || 0,
    threatActors: entities?.filter(e => e.entity_type === "threat_actor").length || 0,
    armedGroups: entities?.filter(e => e.entity_type === "armed_group").length || 0,
    organizations: entities?.filter(e => e.entity_type === "organization").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Entity Resolution
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Threat actors, organizations, and aliases linked across incidents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mergeMode ? (
            <>
              <Badge variant="outline" className="text-[10px] font-mono">
                {mergeSelected.length} selected
              </Badge>
              <Button
                size="sm"
                variant="default"
                onClick={handleOpenMergeDialog}
                disabled={mergeSelected.length < 2}
              >
                <Merge className="h-4 w-4 mr-1" />
                Merge Selected
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setMergeMode(false); setMergeSelected([]); }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setMergeMode(true)} disabled={!entities || entities.length < 2}>
                <Merge className="h-4 w-4 mr-1" />
                Merge Entities
              </Button>
              <Button onClick={handleRunExtraction} disabled={extractMutation.isPending}>
                {extractMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Run Extraction
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Entities</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-400">{stats.threatActors}</div><div className="text-xs text-muted-foreground">Threat Actors</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-400">{stats.armedGroups}</div><div className="text-xs text-muted-foreground">Armed Groups</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{stats.organizations}</div><div className="text-xs text-muted-foreground">Organizations</div></CardContent></Card>
      </div>

      {/* Merge mode hint */}
      {mergeMode && (
        <div className="bg-primary/10 border border-primary/30 rounded p-3 text-xs font-mono text-primary flex items-center gap-2">
          <Merge className="h-4 w-4 shrink-0" />
          Select two or more entities to merge. The source entities will be consolidated into the target entity — all aliases and incident links will be reassigned.
        </div>
      )}

      {/* Entity Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : entities && entities.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Known Entities</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {mergeMode && <TableHead className="w-10"></TableHead>}
                  <TableHead>Entity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-center">Incidents</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map(entity => {
                  const Icon = typeIcons[entity.entity_type] || Users;
                  const isSelected = mergeSelected.includes(entity.id);
                  return (
                    <TableRow
                      key={entity.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/10' : ''}`}
                      onClick={() => mergeMode ? handleToggleMergeSelect(entity.id) : setSelectedEntityId(entity.id)}
                    >
                      {mergeMode && (
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleMergeSelect(entity.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {entity.canonical_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColors[entity.entity_type] || ""}>
                          {entity.entity_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{entity.country_affiliation || "—"}</TableCell>
                      <TableCell className="text-center font-mono">{entity.incident_count}</TableCell>
                      <TableCell className="text-center">
                        <span className={entity.confidence >= 80 ? "text-green-400" : entity.confidence >= 60 ? "text-yellow-400" : "text-red-400"}>
                          {entity.confidence}%
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(entity.last_seen).toLocaleDateString()}
                      </TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No entities extracted yet</p>
            <p className="text-sm mt-1">Click "Run Extraction" to process incidents and extract threat actors, organizations, and aliases.</p>
          </CardContent>
        </Card>
      )}

      {/* Merge Confirmation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Merge Entities
            </DialogTitle>
            <DialogDescription>
              Select the target entity to keep. All other selected entities will be merged into it — their aliases and incident links will be reassigned, and the source records will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target selector */}
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">MERGE INTO (TARGET):</label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {mergeEntities.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.canonical_name} ({e.incident_count} incidents)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">WILL BE MERGED (DELETED):</label>
              {mergeEntities.filter(e => e.id !== mergeTargetId).map(e => {
                const Icon = typeIcons[e.entity_type] || Users;
                return (
                  <div key={e.id} className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{e.canonical_name}</span>
                    <Badge variant="outline" className="text-[10px]">{e.entity_type.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground ml-auto text-xs">{e.incident_count} incidents</span>
                  </div>
                );
              })}
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2 text-[10px] font-mono text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>This action is irreversible. Source entities will be permanently deleted after their data is transferred.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleMerge}
              disabled={mergeMutation.isPending || !mergeTargetId}
            >
              {mergeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Merge className="h-4 w-4 mr-1" />}
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entity Detail Dialog */}
      <Dialog open={!!selectedEntityId && !mergeMode} onOpenChange={(open) => !open && setSelectedEntityId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEntity && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => { const Icon = typeIcons[selectedEntity.entity_type] || Users; return <Icon className="h-5 w-5" />; })()}
                  {selectedEntity.canonical_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={typeColors[selectedEntity.entity_type]}>{selectedEntity.entity_type.replace(/_/g, " ")}</Badge>
                  {selectedEntity.country_affiliation && <Badge variant="secondary">{selectedEntity.country_affiliation}</Badge>}
                  <Badge variant="outline">{selectedEntity.incident_count} incidents</Badge>
                </div>

                {selectedEntity.description && <p className="text-sm text-muted-foreground">{selectedEntity.description}</p>}

                {/* Aliases */}
                {aliases && aliases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Known Aliases</h4>
                    <div className="flex gap-1 flex-wrap">
                      {aliases.map(a => <Badge key={a.id} variant="outline" className="text-xs">{a.alias}</Badge>)}
                    </div>
                  </div>
                )}

                {/* Linked Incidents */}
                {linkedIncidents && linkedIncidents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Linked Incidents ({linkedIncidents.length})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {linkedIncidents.map((link: any) => (
                        <div key={link.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{link.incidents?.title || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{link.incidents?.country} • {link.incidents?.category} • Sev {link.incidents?.severity}</p>
                          </div>
                          <Badge className={`ml-2 text-xs ${roleColors[link.role] || ""}`}>{link.role}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
