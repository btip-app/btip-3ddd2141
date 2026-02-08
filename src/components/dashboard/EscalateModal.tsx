import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

const DIRECTORS = [
  { value: "dir-security", label: "Chief Security Officer" },
  { value: "dir-ops", label: "Director of Operations" },
  { value: "dir-regional", label: "Regional Security Director" },
  { value: "dir-intel", label: "Head of Intelligence" },
];

interface EscalateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  incidentTitle: string;
}

export default function EscalateModal({
  open,
  onOpenChange,
  incidentId,
  incidentTitle,
}: EscalateModalProps) {
  const [priority, setPriority] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!priority || !assignedTo) {
      toast.error("Priority and recipient are required.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to escalate.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("escalations").insert({
      incident_id: incidentId,
      incident_title: incidentTitle,
      priority,
      assigned_to: assignedTo,
      notes: notes.trim() || null,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      console.error("Escalation error:", error);
      toast.error("Failed to submit escalation.");
      return;
    }

    toast.success("Incident escalated successfully.", {
      description: `Assigned to ${DIRECTORS.find((d) => d.value === assignedTo)?.label ?? assignedTo}`,
    });
    setPriority("");
    setAssignedTo("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Escalate Incident
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            ID-{incidentId} • {incidentTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider">
              Priority
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="font-mono text-xs bg-secondary border-border">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent" className="font-mono text-xs">
                  🔴 Urgent — Immediate action required
                </SelectItem>
                <SelectItem value="high" className="font-mono text-xs">
                  🟠 High — Respond within 1 hour
                </SelectItem>
                <SelectItem value="routine" className="font-mono text-xs">
                  🟡 Routine — Next available review
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assign to */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider">
              Notify
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="font-mono text-xs bg-secondary border-border">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {DIRECTORS.map((d) => (
                  <SelectItem
                    key={d.value}
                    value={d.value}
                    className="font-mono text-xs"
                  >
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider">
              Notes{" "}
              <span className="text-muted-foreground normal-case">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Relevant context for the security director…"
              className="font-mono text-xs bg-secondary border-border resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-md bg-destructive text-destructive-foreground font-mono text-[10px] font-medium uppercase tracking-wider transition-all duration-300 hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting…" : "Confirm Escalation"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
