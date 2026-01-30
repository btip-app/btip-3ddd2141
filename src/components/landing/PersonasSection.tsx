const PersonasSection = () => {
  const personas = [
    {
      title: "Security Teams",
      role: "CISOs & SOC Analysts",
      description: "Unified dashboard for threat monitoring, incident response, and compliance reporting."
    },
    {
      title: "Risk Managers",
      role: "Enterprise Risk & Insurance",
      description: "Quantified risk assessments and real-time exposure tracking for informed decisions."
    },
    {
      title: "Operations Leaders",
      role: "COOs & Country Managers",
      description: "Operational intelligence for safe expansion and asset protection across regions."
    },
    {
      title: "Government & NGOs",
      role: "Public Sector & Aid Organizations",
      description: "Regional stability insights and personnel safety monitoring."
    }
  ];

  return (
    <section id="personas" className="py-24 bg-navy-medium">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built For Your Role
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tailored intelligence workflows for every stakeholder in your organization.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((persona, index) => (
            <div 
              key={index}
              className="p-6 rounded-lg border border-border bg-card"
            >
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <span className="text-cyber font-bold">{persona.title.charAt(0)}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">{persona.title}</h3>
              <p className="text-xs text-cyber mb-3">{persona.role}</p>
              <p className="text-sm text-muted-foreground">{persona.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PersonasSection;
