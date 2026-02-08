export type IncidentStatus = "ai" | "reviewed" | "confirmed";

export interface Incident {
  id: string;
  title: string;
  datetime: string;
  location: string;
  severity: number;
  confidence: number;
  status: IncidentStatus;
  category: string;
  region?: string;
  trend?: string;
  summary?: string;
  sources?: string[];
  analyst?: string;
  lat?: number;
  lng?: number;
}
