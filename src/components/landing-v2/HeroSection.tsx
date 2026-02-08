const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Deep background */}
      <div className="absolute inset-0 bg-navy-deep" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--cyber) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyber) / 0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Abstract Africa silhouette — faint watermark */}
      <svg
        viewBox="0 0 100 100"
        className="absolute right-[10%] top-1/2 -translate-y-1/2 w-[40vw] max-w-[500px] opacity-[0.03]"
      >
        <path
          d="M45 15 Q55 12 58 18 L62 25 Q68 28 65 35 L68 42 Q70 48 68 55 L65 62 Q62 68 58 72 L55 78 Q50 82 45 78 L40 72 Q35 68 32 62 L28 55 Q25 48 28 42 L32 35 Q30 28 35 25 L40 18 Q42 15 45 15"
          fill="hsl(var(--cyber))"
          stroke="none"
        />
      </svg>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-8">
          Threat Intelligence Platform
        </p>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight max-w-3xl mx-auto">
          Africa-native. Predictive.{" "}
          <span className="text-cyber">Operational.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-md mx-auto font-mono">
          A daily operating system for security decisions.
        </p>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
