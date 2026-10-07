import { useEffect, useState, type FormEvent } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/finance";

type BusinessDetails = { business_name: string; industry: string; location: string };
const emptyDetails: BusinessDetails = { business_name: "", industry: "", location: "" };

const BusinessProfile = () => {
  const [details, setDetails] = useState<BusinessDetails>(emptyDetails);
  const [saved, setSaved] = useState<BusinessDetails>(emptyDetails);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.from("profiles")
      .select("business_name, industry, location").maybeSingle();
    if (error || !data) {
      setLoadError(true);
    } else {
      const next = { business_name: data.business_name ?? "", industry: data.industry ?? "", location: data.location ?? "" };
      setDetails(next);
      setSaved(next);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const changed = (Object.keys(details) as (keyof BusinessDetails)[])
    .some((key) => details[key].trim() !== saved[key]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = { business_name: details.business_name.trim(), industry: details.industry.trim(), location: details.location.trim() };
    if (!next.business_name) return toast.error("Add your business name first.");
    setSaving(true);
    try {
      const { error } = await updateProfile({ ...next, industry: next.industry || null, location: next.location || null });
      if (error) throw error;
      setDetails(next);
      setSaved(next);
      toast.success("Business profile saved 👏");
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 motion-enter">
        <header className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary shrink-0" aria-hidden="true" />
          <h1 className="text-2xl md:text-3xl font-semibold">Business Profile</h1>
        </header>
        {loading ? (
          <div role="status" className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4" />Loading your profile…</div>
        ) : loadError ? (
          <div className="space-y-4" role="alert">
            <p className="text-muted-foreground">Couldn't load your business profile.</p>
            <Button variant="outline" onClick={() => void load()}>Try again</Button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-6 border-t border-border pt-6">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input id="business-name" autoComplete="organization" required maxLength={150} placeholder="e.g. Brenda's Boutique" value={details.business_name} disabled={saving} onChange={(e) => setDetails({ ...details, business_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" maxLength={150} placeholder="e.g. Retail, food & drinks, farming" value={details.industry} disabled={saving} onChange={(e) => setDetails({ ...details, industry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" maxLength={200} placeholder="e.g. Kampala, Uganda" value={details.location} disabled={saving} onChange={(e) => setDetails({ ...details, location: e.target.value })} />
            </div>
            <div className="border-t border-border pt-5">
              <Button type="submit" disabled={!changed || saving || !details.business_name.trim()}>
                {saving ? <Loader2 aria-hidden="true" /> : <Save aria-hidden="true" />}
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default BusinessProfile;