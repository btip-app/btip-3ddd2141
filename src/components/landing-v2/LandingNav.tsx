import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How It Works", href: "#pillars" },
  { label: "Trust", href: "#trust" },
];

const SECTION_IDS = ["hero", "problem", "solution", "pillars", "trust"];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Map<string, number>();

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
          for (const sId of SECTION_IDS) {
            if (visibleSections.has(sId)) {
              setActiveSection(sId);
              break;
            }
          }
        },
        { threshold: 0.15, rootMargin: "-48px 0px 0px 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled || mobileOpen
            ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="container mx-auto px-6 h-12 flex items-center justify-between">
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

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const sectionId = item.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className={`text-[11px] font-mono uppercase tracking-wider transition-colors duration-300 cursor-pointer ${
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden md:inline text-[11px] font-mono text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-300"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="hidden md:inline px-4 py-1.5 rounded bg-primary text-primary-foreground font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.2)]"
            >
              Get Started
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-1.5 text-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center gap-6 transition-all duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingTop: "3rem" }}
      >
        {NAV_ITEMS.map((item) => {
          const sectionId = item.href.replace("#", "");
          const isActive = activeSection === sectionId;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className={`text-lg font-mono uppercase tracking-wider transition-colors duration-300 ${
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </a>
          );
        })}
        <div className="flex flex-col items-center gap-3 mt-4">
          <Link
            to="/auth"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-mono text-muted-foreground uppercase tracking-wider"
          >
            Sign In
          </Link>
          <Link
            to="/auth"
            onClick={() => setMobileOpen(false)}
            className="px-6 py-2 rounded bg-primary text-primary-foreground font-mono text-sm font-medium uppercase tracking-wider"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
}
