import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { z } from "zod";

const adminSignupSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
  adminCode: z.string().min(1, "Authorization code is required"),
});

export default function AdminSignup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const validation = adminSignupSchema.safeParse({ fullName, email, password, adminCode });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-signup", {
        body: { email: email.trim(), password, fullName: fullName.trim(), adminCode },
      });

      if (fnError) {
        setError(fnError.message || "Failed to create admin account");
      } else if (data?.error) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo-full.png" alt="Bastion Intelligence" className="h-10 w-auto" />
            <span className="text-2xl font-mono font-bold acronym">Bastion Intelligence</span>
          </div>
          <h1 className="text-lg font-mono font-semibold text-foreground flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            Admin Registration
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">
            Authorized Personnel Only
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-sm font-mono font-semibold text-foreground">Admin Account Created</h2>
              <p className="text-[10px] font-mono text-muted-foreground">
                You can now sign in with your credentials.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[10px] mt-2"
                onClick={() => navigate("/auth")}
              >
                Go to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="admin@organization.com"
                  required
                  maxLength={255}
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Authorization Code
                </Label>
                <Input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter admin authorization code"
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
                {loading ? "Creating Account..." : "Create Admin Account"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to standard sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
