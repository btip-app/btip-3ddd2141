const ProblemSection = () => {
  const problems = [
    {
      label: "Fragmented Data",
      visual: (
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-8 h-12 rounded-sm border border-border bg-secondary"
              style={{ transform: `rotate(${(i - 3) * 8}deg) translateY(${Math.abs(i - 3) * 4}px)` }}
            />
          ))}
        </div>
      ),
    },
    {
      label: "Delayed Reports",
      visual: (
        <div className="flex flex-col items-center gap-1">
          {[0.15, 0.25, 0.4, 0.6, 0.8].map((opacity, i) => (
            <div
              key={i}
              className="w-32 h-2 rounded-full bg-muted-foreground"
              style={{ opacity }}
            />
          ))}
        </div>
      ),
    },
    {
      label: "Reactive Decisions",
      visual: (
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-border" />
          <div className="absolute inset-3 rounded-full border border-border" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive" />
        </div>
      ),
    },
  ];

  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono text-center mb-4">
          The Problem
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-20 max-w-xl mx-auto">
          Security teams across Africa operate with broken tools.
        </h2>

        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {problems.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-6">
              <div className="h-28 flex items-center">{p.visual}</div>
              <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
