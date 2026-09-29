import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveTaxProfile } from "@/lib/tax/data";
import type { TaxData } from "@/pages/Tax";

const BusinessDetails = ({ data }: { data: TaxData }) => {
  const p = data.profile;
  const [f, setF] = useState({
    legal_name: p?.legal_name ?? "", tin: p?.tin ?? "", brn: p?.brn ?? "", business_address: p?.business_address ?? "",
    taxpayer_type: p?.taxpayer_type ?? "individual", vat_status: p?.vat_status ?? "unknown",
    vat_registration_date: p?.vat_registration_date ?? "", prices_include_vat: p?.prices_include_vat ?? true,
    efris_status: p?.efris_status ?? "not_registered", efris_device_no: p?.efris_device_no ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (f.tin && !/^\d{10}$/.test(f.tin)) return toast.error("A Ugandan TIN has 10 digits.");
    setSaving(true);
    const { error } = await saveTaxProfile({ ...f, vat_registration_date: f.vat_registration_date || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Business details saved");
    data.reload();
  };

  const field = (k: keyof typeof f, label: string, ph = "") => (
    <div className="space-y-1.5"><Label>{label}</Label><Input value={String(f[k])} placeholder={ph} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-4">
        {field("legal_name", "Registered business name")}
        {field("tin", "TIN", "10 digits")}
        {field("brn", "Business registration no. (BRN)")}
        {field("business_address", "Business address")}
        <div className="space-y-1.5"><Label>Taxpayer type</Label>
          <Select value={f.taxpayer_type} onValueChange={(v) => set("taxpayer_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="individual">Individual / sole trader</SelectItem><SelectItem value="company">Company</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>VAT status</Label>
          <Select value={f.vat_status} onValueChange={(v) => set("vat_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="unknown">Not sure</SelectItem><SelectItem value="not_registered">Not VAT registered</SelectItem><SelectItem value="registered">VAT registered</SelectItem></SelectContent>
          </Select>
        </div>
        {f.vat_status === "registered" && field("vat_registration_date", "VAT registration date", "YYYY-MM-DD")}
        <div className="space-y-1.5"><Label>EFRIS registration</Label>
          <Select value={f.efris_status} onValueChange={(v) => set("efris_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="not_registered">Not registered</SelectItem><SelectItem value="applied">Applied</SelectItem><SelectItem value="registered">Registered with URA</SelectItem></SelectContent>
          </Select>
        </div>
        {f.efris_status !== "not_registered" && field("efris_device_no", "EFRIS device number")}
      </div>
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>My recorded sales amounts already include VAT</span>
        <Switch checked={f.prices_include_vat} onCheckedChange={(v) => set("prices_include_vat", v)} />
      </label>
      <p className="text-xs text-muted-foreground">These are details you tell Kashie. Kashie doesn't check them with URA yet.</p>
      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>
    </div>
  );
};

export default BusinessDetails;
