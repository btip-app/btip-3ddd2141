import LandingNav from "@/components/landing-v2/LandingNav";
import HeroSection from "@/components/landing-v2/HeroSection";
import AppEntryStrip from "@/components/landing-v2/AppEntryStrip";
import ProblemSection from "@/components/landing-v2/ProblemSection";
import ValueCallouts from "@/components/landing-v2/ValueCallouts";
import SolutionSection from "@/components/landing-v2/SolutionSection";
import PillarsSection from "@/components/landing-v2/PillarsSection";
import UserWayfinding from "@/components/landing-v2/UserWayfinding";
import TrustSection from "@/components/landing-v2/TrustSection";
import CTASection from "@/components/landing-v2/CTASection";
import FooterV2 from "@/components/landing-v2/FooterV2";

const LandingV2 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <LandingNav />
      <div id="hero"><HeroSection /></div>
      <AppEntryStrip />
      <div id="problem"><ProblemSection /></div>
      <ValueCallouts />
      <div id="solution"><SolutionSection /></div>
      <div id="pillars"><PillarsSection /></div>
      <UserWayfinding />
      <div id="trust"><TrustSection /></div>
      <CTASection />
      <FooterV2 />
    </div>
  );
};

export default LandingV2;
