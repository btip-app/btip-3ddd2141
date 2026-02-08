import HeroSection from "@/components/landing-v2/HeroSection";
import ProblemSection from "@/components/landing-v2/ProblemSection";
import SolutionSection from "@/components/landing-v2/SolutionSection";
import PillarsSection from "@/components/landing-v2/PillarsSection";
import TrustSection from "@/components/landing-v2/TrustSection";
import CTASection from "@/components/landing-v2/CTASection";
import FooterV2 from "@/components/landing-v2/FooterV2";

const LandingV2 = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <PillarsSection />
      <TrustSection />
      <CTASection />
      <FooterV2 />
    </div>
  );
};

export default LandingV2;
