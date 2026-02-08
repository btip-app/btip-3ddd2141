import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTASection = () => {
  const { ref, isVisible } = useScrollReveal(0.3);

  return (
    <section className="py-32 bg-background" ref={ref}>
      <div className="container mx-auto px-6 text-center">
        <h2
          className="text-2xl md:text-3xl font-bold mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1s ease",
          }}
        >
          Ready to see the full picture?
        </h2>
        <p
          className="text-sm text-muted-foreground font-mono mb-10 max-w-md mx-auto"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 1s ease 0.3s",
          }}
        >
          Gain operational clarity across the continent.
        </p>
        <button
          className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-mono text-sm font-medium uppercase tracking-wider"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s",
          }}
        >
          Request a Briefing
        </button>
      </div>
    </section>
  );
};

export default CTASection;
