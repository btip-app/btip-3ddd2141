import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  FileText,
  Shield,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type { Incident, IncidentStatus } from "@/types/incident";

// Centralised mock data — in production this would come from the DB
const allIncidents: Incident[] = [
  {
    id: "1",
    title: "Armed Robbery Ring Targeting Commercial Vehicles",
    datetime: "2026-01-30 06:45",
    location: "Lagos, Nigeria",
    severity: 4,
    confidence: 87,
    status: "confirmed",
    category: "robbery",
    region: "west-africa",
    summary:
      "Multiple coordinated attacks on commercial vehicles along the Lagos-Ibadan expressway. Criminal group using roadblocks and armed personnel. Three incidents in past 48 hours.",
    sources: ["Local Police Report", "Field Agent LAGOS-07", "Media Monitoring"],
    analyst: "J. Okonkwo",
    lat: 6.5244,
    lng: 3.3792,
  },
  {
    id: "2",
    title: "Kidnapping Threat Near Industrial Zone",
    datetime: "2026-01-30 05:30",
    location: "Port Harcourt, Nigeria",
    severity: 5,
    confidence: 72,
    status: "reviewed",
    category: "kidnapping",
    region: "west-africa",
    summary:
      "Intelligence suggests targeted kidnapping operation planned against expatriate workers in the Trans-Amadi industrial area. Source reliability: B2.",
    sources: ["HUMINT Source PH-12", "Pattern Analysis"],
    analyst: "M. Adeyemi",
    lat: 4.8156,
    lng: 7.0498,
  },
  {
    id: "3",
    title: "Protest Activity Disrupting Supply Routes",
    datetime: "2026-01-30 04:15",
    location: "Nairobi, Kenya",
    severity: 3,
    confidence: 94,
    status: "confirmed",
    category: "protest",
    region: "east-africa",
    summary:
      "Labor union protests blocking Mombasa Road affecting cargo movement from port. Expected to continue for 24-48 hours pending negotiations.",
    sources: ["Ground Team NBO", "Traffic Monitoring", "Social Media Intel"],
    analyst: "P. Kimani",
    lat: -1.2921,
    lng: 36.8219,
  },
  {
    id: "4",
    title: "Suspicious Activity Near Port Facility",
    datetime: "2026-01-29 22:00",
    location: "Mombasa, Kenya",
    severity: 2,
    confidence: 65,
    status: "ai",
    category: "robbery",
    region: "east-africa",
    summary:
      "AI-flagged pattern of unusual vehicle movements near port storage facilities. Requires human verification.",
    sources: ["CCTV Analysis", "Pattern Recognition AI"],
    analyst: "Pending Review",
    lat: -4.0435,
    lng: 39.6682,
  },
  {
    id: "5",
    title: "Civil Unrest Following Election Results",
    datetime: "2026-01-29 18:30",
    location: "Johannesburg, South Africa",
    severity: 4,
    confidence: 91,
    status: "reviewed",
    category: "political",
    region: "southern-africa",
    summary:
      "Post-election tensions escalating in multiple townships. Isolated incidents of property damage reported. Security forces on heightened alert.",
    sources: ["Embassy Cables", "Local Media", "Field Team JNB"],
    analyst: "R. van der Berg",
    lat: -26.2041,
    lng: 28.0473,
  },
  {
    id: "6",
    title: "Escalating Militia Activity in Northern Region",
    datetime: "2026-01-30 03:00",
    location: "Kano, Nigeria",
    severity: 5,
    confidence: 78,
    status: "ai",
    category: "terrorism",
    region: "west-africa",
    summary:
      "Increased movement patterns detected consistent with militant group operations. Cross-referencing with known faction territories.",
    sources: ["Satellite Imagery", "SIGINT", "Regional Partners"],
    analyst: "Pending Review",
    lat: 12.0022,
    lng: 8.592,
  },
  {
    id: "7",
    title: "Increased Piracy Risk in Gulf Waters",
    datetime: "2026-01-30 01:45",
    location: "Gulf of Guinea",
    severity: 4,
    confidence: 83,
    status: "reviewed",
    category: "piracy",
    region: "west-africa",
    summary:
      "Maritime patrols report increased small vessel activity. Two attempted boardings in past week. Recommend enhanced escort protocols.",
    sources: ["IMB Report", "Navy Liaison", "Shipping Intel Network"],
    analyst: "C. Mensah",
    lat: 3.5,
    lng: 2.5,
  },
  {
    id: "8",
    title: "Political Tensions Rising Ahead of Summit",
    datetime: "2026-01-29 20:00",
    location: "Addis Ababa, Ethiopia",
    severity: 3,
    confidence: 69,
    status: "ai",
    category: "political",
    region: "east-africa",
    summary:
      "Social media analysis indicates rising tensions ahead of AU summit. Protest activity possible near diplomatic quarter.",
    sources: ["Social Media Analysis", "Open Source Intel"],
    analyst: "Pending Review",
    lat: 9.0222,
    lng: 38.7469,
  },
  {
    id: "9",
    title: "Road Blockade by Local Groups",
    datetime: "2026-01-30 07:00",
    location: "Accra, Ghana",
    severity: 2,
    confidence: 88,
    status: "confirmed",
    category: "protest",
    region: "west-africa",
    summary:
      "Community groups blocking access road near Tema junction. Dispute over local infrastructure project. Police negotiating.",
    sources: ["Ground Team ACC", "Local Contacts"],
    analyst: "K. Asante",
    lat: 5.556,
    lng: -0.1969,
  },
  {
    id: "10",
    title: "Theft Incidents at Warehouse District",
    datetime: "2026-01-29 23:30",
    location: "Tema, Ghana",
    severity: 3,
    confidence: 76,
    status: "reviewed",
    category: "robbery",
    region: "west-africa",
    summary:
      "Series of break-ins targeting industrial warehouses. Organized group suspected. Enhanced security measures recommended.",
    sources: ["Police Report", "Security Contractor"],
    analyst: "K. Asante",
    lat: 5.6698,
    lng: -0.0166,
  },
];

function getSeverityColor(severity: number) {
  switch (severity) {
    case 5:
      return "bg-destructive text-destructive-foreground";
    case 4:
      return "bg-orange-600 text-white";
    case 3:
      return "bg-amber-600 text-white";
    case 2:
      return "bg-yellow-600 text-black";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getSeverityLabel(severity: number) {
  switch (severity) {
    case 5:
      return "CRITICAL";
    case 4:
      return "HIGH";
    case 3:
      return "MODERATE";
    case 2:
      return "LOW";
    default:
      return "INFO";
  }
}

function getStatusColor(status: IncidentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-600/20 text-emerald-400 border-emerald-600/50";
    case "reviewed":
      return "bg-blue-600/20 text-blue-400 border-blue-600/50";
    case "ai":
      return "bg-purple-600/20 text-purple-400 border-purple-600/50";
  }
}

function getStatusLabel(status: IncidentStatus) {
  switch (status) {
    case "confirmed":
      return "CONFIRMED";
    case "reviewed":
      return "REVIEWED";
    case "ai":
      return "AI";
  }
}

// Recommended actions based on severity
function getRecommendedActions(incident: Incident): string[] {
  const base: string[] = [];
  if (incident.severity >= 4) {
    base.push("Notify regional security director immediately");
    base.push("Activate contingency travel protocols for affected area");
  }
  if (incident.severity >= 3) {
    base.push("Brief operations teams on updated threat posture");
    base.push("Review asset exposure within 50 km radius");
  }
  if (incident.status === "ai") {
    base.push("Assign analyst for manual validation");
  }
  if (incident.category === "kidnapping") {
    base.push("Issue travel advisory for expatriate personnel");
  }
  if (incident.category === "piracy") {
    base.push("Coordinate with maritime security escorts");
  }
  base.push("Continue monitoring for escalation indicators");
  return base;
}

export default function IncidentReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const incident = allIncidents.find((i) => i.id === id);

  if (!incident) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-mono text-muted-foreground">
            Incident not found
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs font-mono text-primary hover:underline"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const actions = getRecommendedActions(incident);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        BACK
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono text-muted-foreground mb-2">
          INCIDENT REPORT • ID-{incident.id} • {incident.category.toUpperCase()}
        </div>
        <h1 className="text-lg font-mono font-bold text-foreground mb-3">
          {incident.title}
        </h1>
        <div className="flex items-center gap-2">
          <Badge
            className={`${getSeverityColor(incident.severity)} text-[10px] font-mono`}
          >
            {getSeverityLabel(incident.severity)}
          </Badge>
          <Badge
            variant="outline"
            className={`${getStatusColor(incident.status)} text-[10px] font-mono`}
          >
            {getStatusLabel(incident.status)}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-muted-foreground/30"
          >
            {incident.confidence}% CONFIDENCE
          </Badge>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetaField
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Location"
          value={incident.location}
        />
        <MetaField
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Timestamp"
          value={incident.datetime}
        />
        <MetaField
          icon={<User className="h-3.5 w-3.5" />}
          label="Analyst"
          value={incident.analyst || "Unassigned"}
        />
        <MetaField
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Region"
          value={
            incident.region
              ? incident.region.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "—"
          }
        />
      </div>
      {incident.lat && incident.lng && (
        <div className="text-[10px] font-mono text-muted-foreground mb-6">
          COORDINATES: {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
        </div>
      )}

      <Separator className="mb-6" />

      {/* Intelligence Summary */}
      <section className="mb-6">
        <SectionHeader
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Intelligence Summary"
        />
        <div className="bg-secondary/30 border border-border rounded p-4">
          <p className="text-xs font-mono text-foreground leading-relaxed">
            {incident.summary || "No intelligence summary available for this incident."}
          </p>
        </div>
      </section>

      {/* Sources */}
      <section className="mb-6">
        <SectionHeader
          icon={<ExternalLink className="h-3.5 w-3.5" />}
          label="Sources"
        />
        <div className="bg-secondary/30 border border-border rounded p-4 space-y-1.5">
          {incident.sources && incident.sources.length > 0 ? (
            incident.sources.map((source, idx) => (
              <div
                key={idx}
                className="text-xs font-mono text-foreground flex items-center gap-2"
              >
                <span className="text-muted-foreground">•</span>
                {source}
              </div>
            ))
          ) : (
            <div className="text-xs font-mono text-muted-foreground">
              No sources listed
            </div>
          )}
        </div>
      </section>

      {/* Recommended Actions */}
      <section className="mb-6">
        <SectionHeader
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Recommended Actions"
        />
        <div className="bg-secondary/30 border border-border rounded p-4 space-y-2">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="text-xs font-mono text-foreground flex items-start gap-2"
            >
              <span className="text-primary font-bold mt-px">{idx + 1}.</span>
              {action}
            </div>
          ))}
        </div>
      </section>

      <Separator className="mb-6" />

      {/* Footer actions */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono rounded border border-border cursor-pointer transition-colors"
        >
          ← BACK TO DASHBOARD
        </button>
        <button
          onClick={() =>
            toast.info("Escalation workflow is not yet available.")
          }
          className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono rounded border border-primary/30 cursor-pointer transition-colors"
        >
          ESCALATE INCIDENT
        </button>
      </div>
    </div>
  );
}

function MetaField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">
        {label}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono text-foreground">
        {icon}
        {value}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wider">
      {icon}
      {label}
    </div>
  );
}
