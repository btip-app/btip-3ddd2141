import { useScrollReveal } from "@/hooks/useScrollReveal";

const TrustSection = () => {
  const { ref, isVisible } = useScrollReveal(0.2);

  const stats = [
    { stat: "24/7", label: "Monitoring" },
    { stat: "54", label: "Countries" },
    { stat: "SOC 2", label: "Compliant" },
  ];

  return (
    <section className="py-32 bg-navy-deep relative" ref={ref}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-6 text-center">
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-16"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        >
          Enterprise Grade
        </p>

        <div className="max-w-2xl mx-auto space-y-8">
          <blockquote
            className="text-xl md:text-2xl font-bold leading-relaxed"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "opacity 1.5s ease 0.3s",
            }}
          >
            "Built for security teams operating across Africa."
          </blockquote>

          <div
            className="h-px w-16 bg-primary mx-auto"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "scaleX(1)" : "scaleX(0)",
              transition: "opacity 0.8s ease 0.8s, transform 0.8s ease 0.8s",
            }}
          />

          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {stats.map((item, i) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 1s ease ${1 + i * 0.2}s`,
                }}
              >
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
