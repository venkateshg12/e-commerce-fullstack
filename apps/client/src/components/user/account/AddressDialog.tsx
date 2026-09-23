import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/constants/constant";
import type { Address } from "@/types";
import type { AddressSchema } from "@repo/types";

type AddressDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address | null;
  saving?: boolean;
  onSave: (values: AddressSchema) => Promise<void>;
};

const defaultForm: AddressSchema = {
  fullName: "",
  address: "",
  state: "",
  city: "",
  country: "India",
  postalCode: "",
  isDefault: false,
};

function AddressDialog({ open, onOpenChange, address, saving = false, onSave }: AddressDialogProps) {
  const [form, setForm] = useState<AddressSchema>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        address
          ? {
              fullName: address.fullName,
              address: address.address,
              state: address.state,
              city: address.city,
              country: address.country,
              postalCode: address.postalCode,
              isDefault: address.isDefault,
            }
          : defaultForm
      );
      setError(null);
    }
  }, [open, address]);

  const handleChange = (field: keyof AddressSchema, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.fullName.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.postalCode.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      await onSave(form);
    } catch (err: any) {
      setError(err?.message || "Failed to save this address.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] cursor-pointer sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? "Edit address" : "Add address"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input id="fullName" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} required />
            </Field>

            <Field>
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Input id="address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} required />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input id="city" value={form.city} onChange={(e) => handleChange("city", e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="state">State</FieldLabel>
                <Select value={form.state} onValueChange={(val) => handleChange("state", val)}>
                  <SelectTrigger id="state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
                <Input id="postalCode" value={form.postalCode} onChange={(e) => handleChange("postalCode", e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="country">Country</FieldLabel>
                <Input id="country" value={form.country} onChange={(e) => handleChange("country", e.target.value)} required />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="cursor-pointer" disabled={saving}>
              {saving ? "Saving..." : address ? "Update address" : "Add address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddressDialog;
