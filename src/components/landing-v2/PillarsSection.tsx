import { FileText, Map, Shield, Bell } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const pillars = [
  {
    icon: FileText,
    title: "Daily Intelligence",
    description: "Curated threat briefs delivered every morning.",
  },
  {
    icon: Map,
    title: "Threat Mapping",
    description: "Geospatial view of incidents across the continent.",
  },
  {
    icon: Shield,
    title: "Assets & Routes",
    description: "Track and protect critical infrastructure.",
  },
  {
    icon: Bell,
    title: "Alerts & Decisions",
    description: "Real-time notifications with actionable context.",
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="border border-border rounded-lg bg-card p-6 flex flex-col gap-4"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
