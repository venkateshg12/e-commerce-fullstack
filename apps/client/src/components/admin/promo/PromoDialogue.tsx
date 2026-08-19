import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Promo, PromoFormValues } from "@/types/coupon.types";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useEffect, useState } from "react";

type PromoDialogueProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promo: Promo | null;
  saving?: boolean;
  onSave: (values: PromoFormValues) => Promise<void>;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const formatDateForDisplay = (dateStr?: string) => {
  if (!dateStr) return "Pick a date & time";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Pick a date & time";
    const dateFormatted = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${dateFormatted} • ${hours}:${minutes}`;
  } catch {
    return "Pick a date & time";
  }
};

const formatDateForInput = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const defaultForm: PromoFormValues = {
  code: "",
  percentage: "",
  count: "",
  minimumOrderValue: "0",
  startsAt: "",
  endsAt: "",
};

const PromoDialogue = ({
  open,
  onOpenChange,
  promo,
  saving = false,
  onSave,
}: PromoDialogueProps) => {
  const [form, setForm] = useState<PromoFormValues>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [startsPopoverOpen, setStartsPopoverOpen] = useState(false);
  const [endsPopoverOpen, setEndsPopoverOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (promo) {
        setForm({
          code: promo.code,
          percentage: String(promo.percentage),
          count: String(promo.count),
          minimumOrderValue: String(promo.minimumOrderValue ?? 0),
          startsAt: formatDateForInput(promo.startsAt),
          endsAt: formatDateForInput(promo.endsAt),
        });
      } else {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        setForm({
          code: "",
          percentage: "10",
          count: "100",
          minimumOrderValue: "0",
          startsAt: now.toISOString().slice(0, 16),
          endsAt: nextWeek.toISOString().slice(0, 16),
        });
      }
      setError(null);
    }
  }, [open, promo]);

  const handleChange = (field: keyof PromoFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleDateSelect = (
    field: "startsAt" | "endsAt",
    selectedDate: Date
  ) => {
    const currentVal = form[field];
    let timeStr = "00:00";

    if (currentVal && currentVal.includes("T")) {
      timeStr = currentVal.split("T")[1] || "00:00";
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const newDateTime = `${year}-${month}-${day}T${timeStr}`;

    handleChange(field, newDateTime);
  };

  const getHourValue = (field: "startsAt" | "endsAt") => {
    const val = form[field];
    if (val && val.includes("T")) {
      return val.split("T")[1].slice(0, 2) || "00";
    }
    return "00";
  };

  const getMinuteValue = (field: "startsAt" | "endsAt") => {
    const val = form[field];
    if (val && val.includes("T")) {
      return val.split("T")[1].slice(3, 5) || "00";
    }
    return "00";
  };

  const handleHourChange = (
    field: "startsAt" | "endsAt",
    newHour: string
  ) => {
    const currentVal = form[field];
    let dateStr = new Date().toISOString().slice(0, 10);
    let minuteStr = "00";

    if (currentVal && currentVal.includes("T")) {
      const parts = currentVal.split("T");
      dateStr = parts[0];
      minuteStr = parts[1]?.slice(3, 5) || "00";
    }

    handleChange(field, `${dateStr}T${newHour}:${minuteStr}`);
  };

  const handleMinuteChange = (
    field: "startsAt" | "endsAt",
    newMinute: string
  ) => {
    const currentVal = form[field];
    let dateStr = new Date().toISOString().slice(0, 10);
    let hourStr = "00";

    if (currentVal && currentVal.includes("T")) {
      const parts = currentVal.split("T");
      dateStr = parts[0];
      hourStr = parts[1]?.slice(0, 2) || "00";
    }

    handleChange(field, `${dateStr}T${hourStr}:${newMinute}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      setError("Promo code is required.");
      return;
    }
    const pct = Number(form.percentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError("Discount percentage must be between 1 and 100.");
      return;
    }
    const cnt = Number(form.count);
    if (isNaN(cnt) || cnt < 0) {
      setError("Usage count must be 0 or greater.");
      return;
    }
    if (!form.startsAt || !form.endsAt) {
      setError("Start and end dates are required.");
      return;
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setError("End date must be after the start date.");
      return;
    }

    try {
      await onSave({
        ...form,
        code: form.code.trim().toUpperCase(),
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to save promo."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-xl font-poppins">
        <DialogHeader>
          <DialogTitle className="font-poppins text-lg font-semibold">
            {promo ? "Edit Promo Code" : "Create Promo Code"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-poppins text-sm font-medium">Promo Code</Label>
            <Input
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER2026"
              className="uppercase font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-poppins text-sm font-medium">
                Discount Percentage (%)
              </Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.percentage}
                onChange={(e) => handleChange("percentage", e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-poppins text-sm font-medium">
                Usage Limit (Count)
              </Label>
              <Input
                type="number"
                min="0"
                value={form.count}
                onChange={(e) => handleChange("count", e.target.value)}
                placeholder="e.g. 100"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-poppins text-sm font-medium">
              Minimum Order Value ($)
            </Label>
            <Input
              type="number"
              min="0"
              value={form.minimumOrderValue}
              onChange={(e) => handleChange("minimumOrderValue", e.target.value)}
              placeholder="e.g. 50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Starts At Picker */}
            <div className="space-y-1.5">
              <Label className="font-poppins text-sm font-medium">Starts At</Label>
              <Popover
                open={startsPopoverOpen}
                onOpenChange={setStartsPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal rounded-sm border border-black/40 bg-transparent px-2.5 py-1 text-sm font-poppins cursor-pointer hover:bg-muted/50 transition-colors shadow-none truncate",
                      !form.startsAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{formatDateForDisplay(form.startsAt)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-3 space-y-3 bg-popover border border-border shadow-xl rounded-xl"
                  align="start"
                >
                  <Calendar
                    selected={form.startsAt ? new Date(form.startsAt) : undefined}
                    onSelect={(date) => {
                      handleDateSelect("startsAt", date);
                    }}
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-border px-1 gap-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={getHourValue("startsAt")}
                        onValueChange={(h) => handleHourChange("startsAt", h)}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs font-mono font-medium">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {HOURS.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs font-mono">
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground font-bold">:</span>
                      <Select
                        value={getMinuteValue("startsAt")}
                        onValueChange={(m) => handleMinuteChange("startsAt", m)}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs font-mono font-medium">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {MINUTES.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs font-mono">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ends At Picker */}
            <div className="space-y-1.5">
              <Label className="font-poppins text-sm font-medium">Ends At</Label>
              <Popover
                open={endsPopoverOpen}
                onOpenChange={setEndsPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal rounded-sm border border-black/40 bg-transparent px-2.5 py-1 text-sm font-poppins cursor-pointer hover:bg-muted/50 transition-colors shadow-none truncate",
                      !form.endsAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{formatDateForDisplay(form.endsAt)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-3 space-y-3 bg-popover border border-border shadow-xl rounded-xl"
                  align="start"
                >
                  <Calendar
                    selected={form.endsAt ? new Date(form.endsAt) : undefined}
                    minDate={form.startsAt ? new Date(form.startsAt) : undefined}
                    onSelect={(date) => {
                      handleDateSelect("endsAt", date);
                    }}
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-border px-1 gap-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={getHourValue("endsAt")}
                        onValueChange={(h) => handleHourChange("endsAt", h)}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs font-mono font-medium">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {HOURS.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs font-mono">
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground font-bold">:</span>
                      <Select
                        value={getMinuteValue("endsAt")}
                        onValueChange={(m) => handleMinuteChange("endsAt", m)}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs font-mono font-medium">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {MINUTES.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs font-mono">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="cursor-pointer">
              {saving ? "Saving..." : promo ? "Update Promo" : "Create Promo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PromoDialogue;