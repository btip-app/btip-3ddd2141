import { AlertTriangle, Shield, Activity, MapPin } from 'lucide-react';

const stats = [
  { label: 'Active Threats', value: '23', icon: AlertTriangle, trend: '+3', color: 'text-destructive' },
  { label: 'Assets Monitored', value: '156', icon: Shield, trend: '+12', color: 'text-primary' },
  { label: 'Incidents Today', value: '7', icon: Activity, trend: '-2', color: 'text-warning' },
  { label: 'Coverage Regions', value: '12', icon: MapPin, trend: '0', color: 'text-muted-foreground' },
];

export default function Overview() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Operations Overview</h1>
        <p className="text-muted-foreground text-sm">Real-time threat intelligence summary</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-destructive' : stat.trend.startsWith('-') ? 'text-green-500' : 'text-muted-foreground'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Threats */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-4">Recent Threat Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded bg-secondary/50">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <div className="flex-1">
                  <div className="text-sm">Threat incident #{1000 + i}</div>
                  <div className="text-xs text-muted-foreground">Lagos, Nigeria • 2h ago</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive">High</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left p-3 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">
              Generate Daily Brief
            </button>
            <button className="w-full text-left p-3 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">
              Export Threat Report
            </button>
            <button className="w-full text-left p-3 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">
              Configure Alerts
            </button>
            <button className="w-full text-left p-3 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm">
              View Asset Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
