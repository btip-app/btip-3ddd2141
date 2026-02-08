const TrustSection = () => {
  return (
    <section className="py-32 bg-navy-deep relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-16">
          Enterprise Grade
        </p>

        <div className="max-w-2xl mx-auto space-y-8">
          <blockquote className="text-xl md:text-2xl font-bold leading-relaxed">
            "Built for security teams operating across Africa."
          </blockquote>

          <div className="h-px w-16 bg-primary mx-auto" />

          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {[
              { stat: "24/7", label: "Monitoring" },
              { stat: "54", label: "Countries" },
              { stat: "SOC 2", label: "Compliant" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold font-mono text-cyber">
                  {item.stat}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
};

export default TrustSection;
