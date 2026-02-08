import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().optional(),
});

//comment to see if push to github works.

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password, fullName });
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setError("Invalid email or password");
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            setError("An account with this email already exists");
          } else {
            setError(error.message);
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-mono font-bold tracking-tight">BTIP</span>
          </div>
          <h1 className="text-lg font-mono font-semibold text-foreground">
            {isLogin ? "Authenticate" : "Request Access"}
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">
            Bastion Threat Intelligence Platform
          </p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[10px] font-mono uppercase text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-secondary border-border font-mono text-sm"
                />
              </div>
            )}

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
              {loading ? "Authenticating..." : isLogin ? "Sign In" : "Request Access"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Need access? Request an account" : "Already have credentials? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
