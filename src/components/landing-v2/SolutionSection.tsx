import { useScrollReveal } from "@/hooks/useScrollReveal";

const SolutionSection = () => {
  const { ref, isVisible } = useScrollReveal(0.2);

  const labels = ["Intel", "Map", "Assets", "Alerts"];

  return (
    <section className="py-32 bg-navy-deep relative overflow-hidden" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-6 text-center">
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          The Solution
        </p>
        <h2
          className="text-2xl md:text-4xl font-bold max-w-lg mx-auto leading-tight"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
          }}
        >
          One platform.{" "}
          <span className="text-cyber">One source of truth.</span>
        </h2>

        {/* Unified system — blocks converge into place */}
        <div className="mt-20 max-w-2xl mx-auto">
          <div
            className="border rounded-lg bg-card p-8"
            style={{
              borderColor: isVisible ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
              transition: "border-color 1.5s ease 1s",
            }}
          >
            {/* Top bar */}
            <div
              className="flex items-center gap-2 mb-6"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 0.8s ease 0.8s",
              }}
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-mono text-muted-foreground">BTIP</span>
              <div className="h-px flex-1 bg-border" />
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>

            {/* 4 blocks converge from scattered positions */}
            <div className="grid grid-cols-4 gap-3">
              {labels.map((label, i) => {
                // Each block starts from a different offset, converges to grid
                const offsets = [
                  { x: -30, y: -20, r: -8 },
                  { x: 20, y: -30, r: 5 },
                  { x: -25, y: 25, r: 6 },
                  { x: 35, y: 15, r: -5 },
                ];
                const o = offsets[i];
                return (
                  <div
                    key={label}
                    className="aspect-[4/3] rounded border border-border bg-secondary flex items-center justify-center"
                    style={{
                      transform: isVisible
                        ? "translate(0, 0) rotate(0deg)"
                        : `translate(${o.x}px, ${o.y}px) rotate(${o.r}deg)`,
                      opacity: isVisible ? 1 : 0.3,
                      transition: `transform 1s cubic-bezier(0.22, 1, 0.36, 1) ${0.5 + i * 0.12}s, opacity 0.8s ease ${0.5 + i * 0.12}s`,
                    }}
                  >
                    <span className="text-xs font-mono text-muted-foreground">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
};

export default SolutionSection;
