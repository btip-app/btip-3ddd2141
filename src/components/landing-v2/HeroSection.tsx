import { useEffect, useState } from "react";
import { useScrollParallax } from "@/hooks/useScrollParallax";

const HeroSection = () => {
  const [mounted, setMounted] = useState(false);
  const { scrollY, viewportHeight } = useScrollParallax();

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Parallax factors — very restrained
  const heroProgress = Math.min(scrollY / viewportHeight, 1);
  const gridShift = heroProgress * 15;
  const mapShift = heroProgress * -25;
  const mapScale = 1 + heroProgress * 0.04;
  const contentShift = heroProgress * 30;

  const scanLines = [
    { y1: 20, y2: 20, delay: 0 },
    { y1: 40, y2: 40, delay: 1.5 },
    { y1: 60, y2: 60, delay: 3 },
  ];

  const markers = [
    { cx: 52, cy: 35 },
    { cx: 48, cy: 52 },
    { cx: 62, cy: 48 },
    { cx: 56, cy: 70 },
    { cx: 42, cy: 45 },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-navy-deep" />

      {/* Grid with subtle parallax drift */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--cyber) / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyber) / 0.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: `translateY(${gridShift}px)`,
          willChange: "transform",
        }}
      />

      {/* Africa silhouette — responds to scroll */}
      <svg
        viewBox="0 0 100 100"
        className="absolute right-[10%] top-1/2 w-[40vw] max-w-[500px]"
        style={{
          opacity: mounted ? 0.06 : 0,
          transition: "opacity 2s ease",
          transform: `translateY(calc(-50% + ${mapShift}px)) scale(${mapScale})`,
          willChange: "transform",
        }}
      >
        <path
          d="M45 15 Q55 12 58 18 L62 25 Q68 28 65 35 L68 42 Q70 48 68 55 L65 62 Q62 68 58 72 L55 78 Q50 82 45 78 L40 72 Q35 68 32 62 L28 55 Q25 48 28 42 L32 35 Q30 28 35 25 L40 18 Q42 15 45 15"
          fill="hsl(var(--cyber))"
          stroke="hsl(var(--cyber))"
          strokeWidth="0.3"
        />
        {scanLines.map((line, i) => (
          <line
            key={i}
            x1="25" y1={line.y1} x2="70" y2={line.y2}
            stroke="hsl(var(--cyber))" strokeWidth="0.3" opacity="0.6"
            className="animate-hero-scan"
            style={{ animationDelay: `${line.delay}s` }}
          />
        ))}
        {markers.map((m, i) => (
          <g key={i}>
            <circle cx={m.cx} cy={m.cy} r="1" fill="hsl(var(--cyber))"
              className="animate-marker-pulse" style={{ animationDelay: `${i * 0.8}s` }} />
            <circle cx={m.cx} cy={m.cy} r="3" fill="none"
              stroke="hsl(var(--cyber))" strokeWidth="0.2"
              className="animate-marker-ring" style={{ animationDelay: `${i * 0.8}s` }} />
          </g>
        ))}
      </svg>

      {/* Content with counter-parallax */}
      <div
        className="relative z-10 container mx-auto px-6 text-center"
        style={{
          transform: `translateY(${contentShift}px)`,
          opacity: Math.max(1 - heroProgress * 1.2, 0),
          willChange: "transform, opacity",
        }}
      >
        <p
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-mono mb-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 1s ease 0.3s, transform 1s ease 0.3s",
          }}
        >
          Threat Intelligence Platform
        </p>
        <h1
          className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight max-w-3xl mx-auto"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 1.2s ease 0.6s, transform 1.2s ease 0.6s",
          }}
        >
          Africa-native. Predictive.{" "}
          <span className="text-cyber">Operational.</span>
        </h1>
        <p
          className="mt-6 text-base md:text-lg text-muted-foreground max-w-md mx-auto font-mono"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 1s ease 1s, transform 1s ease 1s",
          }}
        >
          A daily operating system for security decisions.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
