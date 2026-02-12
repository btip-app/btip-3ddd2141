import { Key, Server, Globe, Shield, Cloud, MessageSquare, Search, Bot, MapPin, Thermometer, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KeyEntry {
  name: string;
  value: string;
  usedIn: string;
  usage: string;
  icon: typeof Key;
  category: 'infrastructure' | 'ingestion' | 'enrichment' | 'frontend';
}

const edgeFunctionKeys: KeyEntry[] = [
  {
    name: 'SUPABASE_URL',
    value: '(Auto-provided by Supabase — your project URL)',
    usedIn: 'All edge functions',
    usage: 'Deno.env.get("SUPABASE_URL") → passed to createClient(supabaseUrl, ...)',
    icon: Server,
    category: 'infrastructure',
  },
  {
    name: 'SUPABASE_ANON_KEY',
    value: '(Auto-provided by Supabase — your anon/public key)',
    usedIn: 'All edge functions',
    usage: 'Deno.env.get("SUPABASE_ANON_KEY") → creates auth-scoped Supabase client',
    icon: Server,
    category: 'infrastructure',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    value: '(Auto-provided by Supabase — your service role key)',
    usedIn: 'admin-signup, geocode-incidents, all ingest-* functions',
    usage: 'Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") → creates admin client that bypasses RLS',
    icon: Shield,
    category: 'infrastructure',
  },
  {
    name: 'ADMIN_SIGNUP_CODE',
    value: '(Your chosen passphrase for admin registration)',
    usedIn: 'admin-signup',
    usage: 'Deno.env.get("ADMIN_SIGNUP_CODE") → compared against user-submitted code to authorize admin registration',
    icon: Shield,
    category: 'infrastructure',
  },
  {
    name: 'OPENCAGE_API_KEY',
    value: '(Get from https://opencagedata.com/dashboard)',
    usedIn: 'geocode-incidents',
    usage: 'Deno.env.get("OPENCAGE_API_KEY") → appended as &key=${OPENCAGE_API_KEY} to https://api.opencagedata.com/geocode/v1/json?q=...',
    icon: MapPin,
    category: 'enrichment',
  },
  {
    name: 'ABUSEIPDB_API_KEY',
    value: '(Get from https://www.abuseipdb.com/account/api)',
    usedIn: 'check-ip-reputation',
    usage: 'Deno.env.get("ABUSEIPDB_API_KEY") → sent as HTTP header Key: ${ABUSEIPDB_API_KEY} to https://api.abuseipdb.com/api/v2/check',
    icon: Monitor,
    category: 'enrichment',
  },
  {
    name: 'OPENWEATHERMAP_API_KEY',
    value: '(Get from https://openweathermap.org/api)',
    usedIn: 'weather-risk',
    usage: 'Deno.env.get("OPENWEATHERMAP_API_KEY") → appended as &appid=${OPENWEATHERMAP_API_KEY} to OpenWeatherMap API',
    icon: Thermometer,
    category: 'enrichment',
  },
  {
    name: 'TELEGRAM_BOT_TOKEN',
    value: '(Get from @BotFather on Telegram)',
    usedIn: 'ingest-telegram',
    usage: 'Deno.env.get("TELEGRAM_BOT_TOKEN") → used in URL https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/...',
    icon: MessageSquare,
    category: 'ingestion',
  },
  {
    name: 'TWITTER_CONSUMER_KEY',
    value: '(Get from developer.x.com)',
    usedIn: 'ingest-twitter',
    usage: 'Deno.env.get("TWITTER_CONSUMER_KEY") → OAuth 1.0a signature generation',
    icon: Globe,
    category: 'ingestion',
  },
  {
    name: 'TWITTER_CONSUMER_SECRET',
    value: '(Get from developer.x.com)',
    usedIn: 'ingest-twitter',
    usage: 'Deno.env.get("TWITTER_CONSUMER_SECRET") → OAuth 1.0a HMAC-SHA1 signing key',
    icon: Globe,
    category: 'ingestion',
  },
  {
    name: 'TWITTER_ACCESS_TOKEN',
    value: '(Get from developer.x.com)',
    usedIn: 'ingest-twitter',
    usage: 'Deno.env.get("TWITTER_ACCESS_TOKEN") → OAuth 1.0a token parameter',
    icon: Globe,
    category: 'ingestion',
  },
  {
    name: 'TWITTER_ACCESS_TOKEN_SECRET',
    value: '(Get from developer.x.com)',
    usedIn: 'ingest-twitter',
    usage: 'Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET") → OAuth 1.0a signing key (combined with consumer secret)',
    icon: Globe,
    category: 'ingestion',
  },
  {
    name: 'FIRECRAWL_API_KEY',
    value: '(Get from https://firecrawl.dev)',
    usedIn: 'ingest-incidents, ingest-meta',
    usage: 'Deno.env.get("FIRECRAWL_API_KEY") → sent as Authorization: Bearer ${FIRECRAWL_API_KEY} to Firecrawl scraping API',
    icon: Search,
    category: 'ingestion',
  },
  {
    name: 'LOVABLE_API_KEY',
    value: '(Auto-provided by Lovable Cloud)',
    usedIn: 'copilot-analyze',
    usage: 'Deno.env.get("LOVABLE_API_KEY") → AI gateway authorization header for streaming analysis',
    icon: Bot,
    category: 'infrastructure',
  },
];

const frontendKeys: KeyEntry[] = [
  {
    name: 'VITE_SUPABASE_URL',
    value: 'https://<your-project-id>.supabase.co',
    usedIn: 'src/integrations/supabase/client.ts',
    usage: 'import.meta.env.VITE_SUPABASE_URL → Supabase client initialization',
    icon: Server,
    category: 'frontend',
  },
  {
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    value: '(Same as SUPABASE_ANON_KEY)',
    usedIn: 'src/integrations/supabase/client.ts',
    usage: 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY → Supabase anon key for client',
    icon: Key,
    category: 'frontend',
  },
  {
    name: 'VITE_MAPBOX_TOKEN',
    value: '(Your Mapbox public token starting with pk.eyJ1...)',
    usedIn: 'src/pages/dashboard/ThreatMap.tsx',
    usage: 'import.meta.env.VITE_MAPBOX_TOKEN → mapboxgl.accessToken for map rendering',
    icon: Cloud,
    category: 'frontend',
  },
];

const categoryColors: Record<string, string> = {
  infrastructure: 'bg-primary/15 text-primary border-primary/30',
  ingestion: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  enrichment: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  frontend: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function KeyRow({ entry }: { entry: KeyEntry }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-colors">
      <entry.icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-mono font-bold text-foreground">{entry.name}</code>
          <Badge variant="outline" className={`text-[10px] font-mono uppercase ${categoryColors[entry.category]}`}>
            {entry.category}
          </Badge>
        </div>
        <div className="bg-secondary/80 rounded px-3 py-1.5 border border-border">
          <code className="text-xs font-mono text-muted-foreground break-all">{entry.name} = {entry.value}</code>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          <span className="text-primary/80">Used in:</span> {entry.usedIn}
        </p>
        <p className="text-xs text-muted-foreground/70 font-mono break-all">
          <span className="text-primary/80">How:</span> {entry.usage}
        </p>
      </div>
    </div>
  );
}

export default function KeysUsed() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold text-foreground">Keys &amp; Tokens Reference</h1>
          <p className="text-sm text-muted-foreground font-mono mt-2">
            Complete reference of every secret and environment variable used across the BTIP platform.
            <br />
            Set Edge Function secrets in <strong>Supabase Dashboard → Settings → Edge Functions → Secrets</strong> and VITE_* variables in the <strong>.env</strong> file.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryColors).map(([cat, cls]) => (
            <Badge key={cat} variant="outline" className={`text-[10px] font-mono uppercase ${cls}`}>
              {cat}
            </Badge>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Edge Function Secrets — Set in Supabase Dashboard
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Accessed via <code className="text-primary">Deno.env.get("SECRET_NAME")</code> inside edge functions
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {edgeFunctionKeys.map((entry) => (
              <KeyRow key={entry.name} entry={entry} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Frontend .env Variables — Set in project .env file
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Accessed via <code className="text-primary">import.meta.env.VITE_*</code> in frontend code
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {frontendKeys.map((entry) => (
              <KeyRow key={entry.name} entry={entry} />
            ))}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground font-mono py-4 border-t border-border">
          ⚠️ Actual secret values are encrypted and cannot be displayed here. Obtain values from your API provider dashboards or share them directly with your developer.
        </div>
      </div>
    </div>
  );
}
