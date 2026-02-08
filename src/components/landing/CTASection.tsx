import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center rounded-2xl border border-border bg-card p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Secure Your Operations?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join the waitlist for early access to Africa's most advanced threat intelligence platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/auth"
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-center"
            >
              Request Access
            </Link>
            <Link
              to="/auth"
              className="w-full sm:w-auto px-6 py-3 rounded-md border border-border text-foreground font-medium hover:bg-secondary transition-colors text-center"
            >
              Sign In
            </Link>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required • Enterprise-grade security • SOC2 compliant
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
