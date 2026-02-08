import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const NAV_ITEMS = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How It Works", href: "#pillars" },
  { label: "Trust", href: "#trust" },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-6 h-12 flex items-center justify-between">
        {/* Brand */}
        <a
          href="#hero"
          onClick={(e) => handleAnchorClick(e, "#hero")}
          className="flex items-center gap-2 group"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-mono font-bold text-sm tracking-tight text-foreground">
            BTIP
          </span>
        </a>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-300 cursor-pointer"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-300"
          >
            Sign In
          </Link>
          <Link
            to="/auth"
            className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
