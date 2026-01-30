export default function DailyBrief() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold">Daily Brief</h1>
          <p className="text-muted-foreground text-xs font-mono">Intelligence summaries and threat reports</p>
        </div>
        <div className="text-xs font-mono text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground text-xs font-mono">[DAILY_BRIEF_MODULE]</div>
          <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
        </div>
      </div>
    </div>
  );
}
