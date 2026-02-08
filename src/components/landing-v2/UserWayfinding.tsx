import { useScrollReveal } from "@/hooks/useScrollReveal";

const personas = [
  "Security Leaders",
  "Analysts",
  "Operations Teams",
  "Executives",
];

const UserWayfinding = () => {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <section className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-6 text-center">
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-10"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          Built For
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {personas.map((p, i) => (
            <span
              key={p}
              className="px-5 py-2 rounded-full border border-border text-sm font-mono text-muted-foreground"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: `opacity 0.6s ease ${0.2 + i * 0.12}s`,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserWayfinding;
