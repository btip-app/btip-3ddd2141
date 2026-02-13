import { useState } from "react";
import { Link } from "react-router-dom";
import BriefingModal from "./BriefingModal";

const FooterV2 = () => {
  const [briefingOpen, setBriefingOpen] = useState(false);

  return (
    <footer className="py-10 border-t border-border bg-navy-deep">
      <div className="container mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-xs font-mono text-muted-foreground">
            © {new Date().getFullYear()} <span className="acronym">BTIP</span>
          </span>

          <nav className="flex items-center gap-6">
            <Link
              to="/auth"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Get Started
            </Link>
            <button
              onClick={() => setBriefingOpen(true)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Request Briefing
            </button>
          </nav>

          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            Africa-Native Threat Intelligence
          </span>
        </div>
      </div>
      <BriefingModal open={briefingOpen} onOpenChange={setBriefingOpen} />
    </footer>
  );
};

export default FooterV2;
