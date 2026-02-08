const SolutionSection = () => {
  return (
    <section className="py-32 bg-navy-deep relative overflow-hidden">
      {/* Subtle horizontal line accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-4">
          The Solution
        </p>
        <h2 className="text-2xl md:text-4xl font-bold max-w-lg mx-auto leading-tight">
          One platform.{" "}
          <span className="text-cyber">One source of truth.</span>
        </h2>

        {/* Visual: unified system block */}
        <div className="mt-20 max-w-2xl mx-auto">
          <div className="border border-border rounded-lg bg-card p-8">
            {/* Top bar */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-mono text-muted-foreground">
                BTIP
              </span>
              <div className="h-px flex-1 bg-border" />
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>

            {/* 4 unified blocks */}
            <div className="grid grid-cols-4 gap-3">
              {["Intel", "Map", "Assets", "Alerts"].map((label) => (
                <div
                  key={label}
                  className="aspect-[4/3] rounded border border-border bg-secondary flex items-center justify-center"
                >
                  <span className="text-xs font-mono text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
};

export default SolutionSection;
