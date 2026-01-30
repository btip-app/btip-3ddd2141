const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16">
      {/* Background Grid Placeholder */}
      <div className="absolute inset-0 bg-navy-deep">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(hsl(var(--cyber) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyber) / 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 rounded-full border border-border bg-secondary text-xs text-muted-foreground uppercase tracking-wider">
              Africa-Native Security OS
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              See the Threat Before<br />
              <span className="text-cyber">It Sees You</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Unified threat intelligence built for Africa's unique security landscape. 
              Real-time monitoring, predictive analytics, and actionable insights.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium">
                Request Early Access
              </button>
              <button className="px-6 py-3 rounded-md border border-border text-foreground font-medium">
                Watch Demo
              </button>
            </div>
          </div>
          
          {/* Right: Visualization Placeholder */}
          <div className="relative aspect-square max-w-lg mx-auto w-full">
            <div className="absolute inset-0 rounded-full border border-border bg-navy-medium flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full border-2 border-dashed border-cyber" />
                <p className="text-sm">Radar Animation Placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
