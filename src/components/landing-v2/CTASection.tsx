import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import BriefingModal from "./BriefingModal";

const CTASection = () => {
  const { ref, isVisible } = useScrollReveal(0.3);
  const [modalOpen, setModalOpen] = useState(false);

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
          onClick={() => setModalOpen(true)}
          className="group relative px-8 py-3 rounded-md bg-primary text-primary-foreground font-mono text-sm font-medium uppercase tracking-wider overflow-hidden transition-all duration-500 ease-out hover:shadow-[0_0_24px_hsl(var(--primary)/0.25)] hover:tracking-[0.15em]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s, box-shadow 0.5s ease, letter-spacing 0.5s ease",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
          <span className="relative">Request a Briefing</span>
        </button>
        <BriefingModal open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </section>
  );
};

export default CTASection;
