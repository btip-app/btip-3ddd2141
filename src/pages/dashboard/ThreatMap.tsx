export default function ThreatMap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-mono font-bold">Threat Map</h1>
        <p className="text-muted-foreground text-xs font-mono">Geographic threat visualization</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg h-[calc(100vh-180px)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground text-xs font-mono">[THREAT_MAP_MODULE]</div>
          <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
        </div>
      </div>
    </div>
  );
}
