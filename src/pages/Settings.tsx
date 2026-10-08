import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CurrencySelect, { isValidCurrency } from "@/components/CurrencySelect";
import { getCurrency, setCurrency } from "@/lib/currency";
import { getProfile, updateProfile } from "@/lib/finance";

const Settings = () => {
  const [saved, setSaved] = useState<string | null>(null);
  const [value, setValue] = useState(getCurrency());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const changed = value !== saved;

  useEffect(() => {
    let active = true;
    getProfile().then((profile) => {
      if (!active) return;
      setSaved(profile?.currency ?? null);
      setValue(profile?.currency ?? "");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (!isValidCurrency(value)) return toast.error("Enter a 3-letter currency code");
    setSaving(true);
    const { error } = await updateProfile({ currency: value });
    setSaving(false);
    if (error) return toast.error("Couldn't save that. Try again?");
    setCurrency(value);
    toast.success(`Amounts now show in ${value}`);
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-semibold">Settings</h1>
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-base font-semibold">Business Currency</Label>
            <p className="text-sm text-muted-foreground">Used for every amount across Kashie, including reports and Kashie's chat replies.</p>
          </div>
          <CurrencySelect id="currency" value={value} onChange={setValue} />
          {!loading && !saved && <p className="text-sm text-muted-foreground">Your business currency is not set yet.</p>}
          {changed && saved && (
            <p className="flex gap-2 text-sm rounded-xl bg-warning-soft text-warning-strong p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              This only changes how amounts are shown. Your existing numbers are not converted, so 50,000 stays 50,000.
            </p>
          )}
          <Button onClick={save} disabled={loading || !changed || saving || !isValidCurrency(value)}>{saving ? "Saving…" : "Save currency"}</Button>
        </section>
      </div>
    </AppLayout>
  );
};

export default Settings;
