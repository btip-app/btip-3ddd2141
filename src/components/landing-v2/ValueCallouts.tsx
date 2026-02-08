import { useScrollReveal } from "@/hooks/useScrollReveal";

const callouts = [
  "Daily intelligence, not alerts chaos",
  "Africa-native threat coverage",
  "Assets, routes, and risk—connected",
  "Decision support, not black-box AI",
];

const ValueCallouts = () => {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <section className="py-20 bg-background" ref={ref}>
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-x-12 gap-y-5">
          {callouts.map((text, i) => (
            <p
              key={i}
              className="text-sm md:text-base font-bold tracking-tight border-l-2 border-primary/30 pl-4"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateX(0)" : "translateX(-8px)",
                transition: `opacity 0.6s ease ${0.15 * i}s, transform 0.6s ease ${0.15 * i}s`,
              }}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueCallouts;
