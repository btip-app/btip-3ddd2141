const CTASection = () => {
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to see the full picture?
        </h2>
        <p className="text-sm text-muted-foreground font-mono mb-10 max-w-md mx-auto">
          Gain operational clarity across the continent.
        </p>
        <button className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-mono text-sm font-medium uppercase tracking-wider">
          Request a Briefing
        </button>
      </div>
    </section>
  );
};

export default CTASection;
