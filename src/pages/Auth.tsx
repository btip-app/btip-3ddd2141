import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const requestSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  organization: z.string().trim().max(100).optional(),
  reason: z.string().trim().max(500).optional(),
});

export default function Auth() {
  const [mode, setMode] = useState<"login" | "request">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [roleRequested, setRoleRequested] = useState("viewer");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message.includes("Invalid login credentials")
        ? "Invalid email or password"
        : error.message);
    }
    setLoading(false);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validation = requestSchema.safeParse({ fullName, email, organization, reason });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("access_requests").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      organization: organization.trim() || null,
      role_requested: roleRequested,
      reason: reason.trim() || null,
    });

    if (error) {
      setError(error.message);
    } else {
      setRequestSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo-full.png" alt="Bastion Intelligence" className="h-12 w-auto" />
            {/* <span className="text-2xl font-mono font-bold tracking-tight">Bastion Intelligence</span> */}
          </div>
          <h1 className="text-lg font-mono font-semibold text-foreground">
            {mode === "login" ? "Authenticate" : "Request Access"}
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">
            Bastion Intelligence Platform
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@organization.com"
                  required
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-[11px] font-mono text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full font-mono text-sm" disabled={loading}>
                {loading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          ) : requestSubmitted ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-sm font-mono font-semibold text-foreground">Request Submitted</h2>
              <p className="text-[10px] font-mono text-muted-foreground">
                Your access request has been sent to the admin team. You'll receive credentials once approved.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[10px] mt-2"
                onClick={() => { setMode("login"); setRequestSubmitted(false); setError(null); }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  maxLength={100}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  required
                  maxLength={255}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Organization</Label>
                <Input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Your company or team (optional)"
                  maxLength={100}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Requested Role</Label>
                <Select value={roleRequested} onValueChange={setRoleRequested}>
                  <SelectTrigger className="bg-secondary border-border font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="viewer" className="font-mono text-sm">Viewer</SelectItem>
                    <SelectItem value="analyst" className="font-mono text-sm">Analyst</SelectItem>
                    <SelectItem value="operator" className="font-mono text-sm">Operator</SelectItem>
                    <SelectItem value="executive" className="font-mono text-sm">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Reason (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need access?"
                  maxLength={500}
                  rows={3}
                  className="bg-secondary border-border font-mono text-sm resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-[11px] font-mono text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full font-mono text-sm" disabled={loading}>
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "request" : "login");
                setError(null);
                setRequestSubmitted(false);
              }}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login" ? "Need access? Request an account" : "Already have credentials? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
