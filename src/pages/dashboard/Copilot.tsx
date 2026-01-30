export default function Copilot() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-mono font-bold">Copilot</h1>
        <p className="text-muted-foreground text-xs font-mono">AI-powered threat analysis assistant</p>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground text-xs font-mono">[COPILOT_MODULE]</div>
          <div className="text-muted-foreground/50 text-[10px] font-mono">Awaiting implementation</div>
        </div>
      </div>
    </div>
  );
}
