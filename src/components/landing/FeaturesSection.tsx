const FeaturesSection = () => {
  const features = [
    {
      title: "Daily Intelligence Brief",
      description: "AI-curated morning reports tailored to your operational context.",
      placeholder: "Brief Preview Placeholder"
    },
    {
      title: "Interactive Threat Map",
      description: "Real-time geospatial visualization of threats across Africa.",
      placeholder: "Map Placeholder"
    },
    {
      title: "AI Copilot",
      description: "Natural language queries for instant threat analysis and recommendations.",
      placeholder: "Chat Interface Placeholder"
    },
    {
      title: "Predictive Analytics",
      description: "Machine learning models trained on African threat patterns.",
      placeholder: "Analytics Dashboard Placeholder"
    }
  ];

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Platform <span className="text-cyber">Features</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Purpose-built tools for African security intelligence operations.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              {/* Feature Preview Placeholder */}
              <div className="aspect-video bg-navy-medium flex items-center justify-center border-b border-border">
                <div className="text-center text-muted-foreground">
                  <div className="h-12 w-12 mx-auto mb-2 rounded border border-dashed border-border" />
                  <p className="text-xs">{feature.placeholder}</p>
                </div>
              </div>
              
              {/* Feature Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
