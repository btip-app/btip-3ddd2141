import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const AppEntryStrip = () => {
  const { ref, isVisible } = useScrollReveal(0.5);

  return (
    <section
      ref={ref}
      className="py-6 bg-secondary border-y border-border"
    >
      <div
        className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <span className="text-xs font-mono text-muted-foreground tracking-wide">
          Access your intelligence workspace
        </span>
        <div className="flex items-center gap-3">
          <Link
            to="/auth"
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
          >
            Get Started
          </Link>
          <Link
            to="/auth"
            className="px-5 py-2 rounded-md border border-border text-muted-foreground font-mono text-xs font-medium uppercase tracking-wider transition-colors duration-300 hover:text-foreground hover:border-muted-foreground"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AppEntryStrip;
