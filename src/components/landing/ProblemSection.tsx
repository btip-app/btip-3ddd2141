const ProblemSection = () => {
  const problems = [
    {
      title: "Fragmented Intelligence",
      description: "Security data scattered across multiple sources with no unified view.",
      icon: "📊"
    },
    {
      title: "Visibility Gaps",
      description: "Critical blind spots in threat detection across African regions.",
      icon: "👁️"
    },
    {
      title: "Reactive Posture",
      description: "Always responding to threats after the damage is done.",
      icon: "⚡"
    },
    {
      title: "Context Deficit",
      description: "Generic global tools that miss Africa-specific threat patterns.",
      icon: "🌍"
    }
  ];

  return (
    <section id="problem" className="py-24 bg-navy-medium">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The Problem We Solve
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            African organizations face unique security challenges that global tools weren't designed to address.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="p-6 rounded-lg border border-border bg-card"
            >
              <div className="text-3xl mb-4">{problem.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
              <p className="text-sm text-muted-foreground">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
