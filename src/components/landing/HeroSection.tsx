const HeroSection = () => {
  const threatMarkers = [
    { id: 1, cx: 52, cy: 35, city: "Cairo", level: "high" },
    { id: 2, cx: 48, cy: 52, city: "Lagos", level: "critical" },
    { id: 3, cx: 62, cy: 48, city: "Nairobi", level: "medium" },
    { id: 4, cx: 56, cy: 70, city: "Johannesburg", level: "high" },
    { id: 5, cx: 42, cy: 45, city: "Accra", level: "medium" },
    { id: 6, cx: 58, cy: 40, city: "Khartoum", level: "low" },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical": return "hsl(var(--threat-red))";
      case "high": return "hsl(var(--warning-amber))";
      case "medium": return "hsl(var(--cyber))";
      default: return "hsl(var(--success-green))";
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Grid */}
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
            <div className="inline-block px-3 py-1 rounded-full border border-border bg-secondary text-xs text-muted-foreground uppercase tracking-wider animate-fade-in-up opacity-0 [animation-delay:0.1s] [animation-fill-mode:forwards]">
              Africa-Native Security OS
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in-up opacity-0 [animation-delay:0.2s] [animation-fill-mode:forwards]">
              See the Threat Before<br />
              <span className="text-cyber">It Sees You</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg animate-fade-in-up opacity-0 [animation-delay:0.35s] [animation-fill-mode:forwards]">
              Unified threat intelligence built for Africa's unique security landscape. 
              Real-time monitoring, predictive analytics, and actionable insights.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up opacity-0 [animation-delay:0.5s] [animation-fill-mode:forwards]">
              <button className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium">
                Request Early Access
              </button>
              <button className="px-6 py-3 rounded-md border border-border text-foreground font-medium">
                Watch Demo
              </button>
            </div>
          </div>
          
          {/* Right: Africa Map Visualization */}
          <div className="relative aspect-square max-w-lg mx-auto w-full">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Africa continent outline */}
              <path
                d="M45 15 Q55 12 58 18 L62 25 Q68 28 65 35 L68 42 Q70 48 68 55 L65 62 Q62 68 58 72 L55 78 Q50 82 45 78 L40 72 Q35 68 32 62 L28 55 Q25 48 28 42 L32 35 Q30 28 35 25 L40 18 Q42 15 45 15"
                fill="none"
                stroke="hsl(var(--cyber))"
                strokeWidth="0.5"
                opacity="0.4"
              />
              
              {/* Proximity rings for each marker */}
              {threatMarkers.map((marker) => (
                <g key={`ring-${marker.id}`}>
                  {/* Outer proximity ring */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="8"
                    fill="none"
                    stroke={getLevelColor(marker.level)}
                    strokeWidth="0.3"
                    opacity="0.3"
                    className="animate-proximity-pulse"
                    style={{ animationDelay: `${marker.id * 0.5}s` }}
                  />
                  {/* Middle proximity ring */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="5"
                    fill="none"
                    stroke={getLevelColor(marker.level)}
                    strokeWidth="0.2"
                    opacity="0.2"
                    className="animate-proximity-pulse"
                    style={{ animationDelay: `${marker.id * 0.3}s` }}
                  />
                </g>
              ))}

              {/* Animated pulse rings */}
              {threatMarkers.map((marker) => (
                <circle
                  key={`pulse-${marker.id}`}
                  cx={marker.cx}
                  cy={marker.cy}
                  r="2"
                  fill="none"
                  stroke={getLevelColor(marker.level)}
                  strokeWidth="0.5"
                  className="animate-pulse-ring"
                  style={{ animationDelay: `${marker.id * 0.4}s` }}
                />
              ))}

              {/* Incident markers (dots) */}
              {threatMarkers.map((marker) => (
                <g key={`marker-${marker.id}`}>
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="1.5"
                    fill={getLevelColor(marker.level)}
                    className="animate-pulse-dot"
                    style={{ animationDelay: `${marker.id * 0.2}s` }}
                  />
                  {/* Glow effect */}
                  <circle
                    cx={marker.cx}
                    cy={marker.cy}
                    r="2.5"
                    fill={getLevelColor(marker.level)}
                    opacity="0.3"
                    className="animate-pulse-dot"
                    style={{ animationDelay: `${marker.id * 0.2}s` }}
                  />
                </g>
              ))}

              {/* Connection lines between nearby markers */}
              <g opacity="0.15" stroke="hsl(var(--cyber))" strokeWidth="0.3">
                <line x1="48" y1="52" x2="42" y2="45" />
                <line x1="62" y1="48" x2="58" y2="40" />
                <line x1="52" y1="35" x2="58" y2="40" />
                <line x1="62" y1="48" x2="56" y2="70" />
              </g>
            </svg>

            {/* Time slider bar */}
            <div className="absolute bottom-4 left-4 right-4 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full w-1/3 bg-primary rounded-full animate-slide-time"
              />
            </div>
            
            {/* Time labels */}
            <div className="absolute bottom-8 left-4 right-4 flex justify-between text-xs text-muted-foreground">
              <span>00:00</span>
              <span>Live Feed</span>
              <span>24:00</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
