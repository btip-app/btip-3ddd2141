import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface BriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BriefingModal = ({ open, onOpenChange }: BriefingModalProps) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast({
        title: "Request received",
        description: "We'll be in touch within 24 hours.",
      });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg tracking-wide">
            Request a Briefing
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            Tell us about your operational environment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
              Name
            </Label>
            <Input
              id="name"
              required
              maxLength={100}
              placeholder="Full name"
              className="font-mono text-sm bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider">
              Work Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              maxLength={255}
              placeholder="you@organization.com"
              className="font-mono text-sm bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org" className="font-mono text-xs uppercase tracking-wider">
              Organization
            </Label>
            <Input
              id="org"
              required
              maxLength={150}
              placeholder="Company or agency"
              className="font-mono text-sm bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="context" className="font-mono text-xs uppercase tracking-wider">
              Context <span className="text-muted-foreground normal-case">(optional)</span>
            </Label>
            <Textarea
              id="context"
              maxLength={500}
              rows={3}
              placeholder="Regions of interest, operational needs…"
              className="font-mono text-sm bg-secondary border-border resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-mono text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_16px_hsl(var(--primary)/0.2)] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BriefingModal;
