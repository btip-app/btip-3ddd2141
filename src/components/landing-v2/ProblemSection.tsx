import { useScrollReveal } from "@/hooks/useScrollReveal";

const ProblemSection = () => {
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
          The Problem
        </p>
        <h2
          className="text-2xl md:text-3xl font-bold text-center mb-20 max-w-xl mx-auto"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
          }}
        >
          Security teams across Africa operate with broken tools.
        </h2>

        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {/* Fragmented Data — cards drift apart */}
          <div
            className="flex flex-col items-center gap-6"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "opacity 0.8s ease 0.4s",
            }}
          >
            <div className="h-28 flex items-center">
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-12 rounded-sm border border-border bg-secondary"
                    style={{
                      transform: isVisible
                        ? `rotate(${(i - 3) * 12}deg) translateY(${Math.abs(i - 3) * 8}px) translateX(${(i - 3) * 4}px)`
                        : `rotate(0deg) translateY(0) translateX(0)`,
                      opacity: isVisible ? (0.4 + (i % 3) * 0.2) : 1,
                      transition: `transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + i * 0.1}s, opacity 1s ease ${0.4 + i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Fragmented Data
            </span>
          </div>

          {/* Delayed Reports — bars stagger in with low opacity */}
          <div
            className="flex flex-col items-center gap-6"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "opacity 0.8s ease 0.6s",
            }}
          >
            <div className="h-28 flex items-center">
              <div className="flex flex-col items-center gap-1">
                {[0.15, 0.25, 0.4, 0.6, 0.8].map((baseOpacity, i) => (
                  <div
                    key={i}
                    className="h-2 rounded-full bg-muted-foreground"
                    style={{
                      width: isVisible ? `${80 + i * 10}px` : "128px",
                      opacity: isVisible ? baseOpacity : 0,
                      transform: isVisible ? `translateX(${(i % 2 === 0 ? 1 : -1) * (i * 3)}px)` : "translateX(0)",
                      transition: `all 1s ease ${0.6 + i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Delayed Reports
            </span>
          </div>

          {/* Reactive Decisions — rings desync */}
          <div
            className="flex flex-col items-center gap-6"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "opacity 0.8s ease 0.8s",
            }}
          >
            <div className="h-28 flex items-center">
              <div className="relative w-20 h-20 mx-auto">
                <div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-border"
                  style={{
                    transform: isVisible ? "scale(1.15) translate(3px, -2px)" : "scale(1)",
                    transition: "transform 1.5s ease 0.8s",
                  }}
                />
                <div
                  className="absolute inset-3 rounded-full border border-border"
                  style={{
                    transform: isVisible ? "scale(0.9) translate(-2px, 3px)" : "scale(1)",
                    transition: "transform 1.5s ease 1s",
                  }}
                />
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-destructive"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transition: "opacity 0.6s ease 1.2s",
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
              Reactive Decisions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
