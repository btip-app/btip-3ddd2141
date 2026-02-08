import { FileText, Map, Shield, Bell, Brain } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const pillars = [
  {
    icon: FileText,
    title: "Daily Brief",
    description: "Curated threat briefs delivered every morning.",
    sentence: "What changed today and why it matters.",
  },
  {
    icon: Map,
    title: "Threat Map",
    description: "Geospatial view of incidents across the continent.",
    sentence: "Live incidents tied to geography.",
  },
  {
    icon: Shield,
    title: "Assets & Routes",
    description: "Track and protect critical infrastructure.",
    sentence: "Risk relative to what you operate.",
  },
  {
    icon: Bell,
    title: "Alerts",
    description: "Real-time notifications with actionable context.",
    sentence: "Signal when risk crosses thresholds.",
  },
  {
    icon: Brain,
    title: "Copilot",
    description: "AI-assisted decision support.",
    sentence: "Evidence-backed decision support.",
  },
];

const PillarsSection = () => {
  const { ref, isVisible } = useScrollReveal(0.15);

  return (
    <section className="py-32 bg-background" ref={ref}>
      <div className="container mx-auto px-6">
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono text-center mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          How It Works
        </p>
        <h2
          className="text-2xl md:text-3xl font-bold text-center mb-20"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s",
          }}
        >
          Four operational pillars.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="border border-border rounded-lg bg-card p-6 flex flex-col gap-4 transition-[border-color,box-shadow] duration-500 ease-out hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.06)]"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.7s ease ${0.3 + i * 0.2}s, transform 0.7s ease ${0.3 + i * 0.2}s`,
              }}
            >
              <div className="w-10 h-10 rounded border border-border bg-secondary flex items-center justify-center">
                <pillar.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {pillar.title}
              </h3>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                {pillar.description}
              </p>
              <p className="text-xs text-primary/70 font-mono italic mt-auto pt-2 border-t border-border/50">
                {pillar.sentence}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
