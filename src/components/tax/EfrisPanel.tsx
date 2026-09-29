import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/finance";
import { VAT } from "@/lib/tax/rules";
import { deleteProduct, saveDocument, saveProduct, type EfrisDocument } from "@/lib/tax/data";
import type { TaxData } from "@/pages/Tax";

const DOC_LABEL: Record<string, string> = { invoice: "Invoice", receipt: "Receipt", credit_note: "Credit note", debit_note: "Debit note" };
const PREFIX: Record<string, string> = { invoice: "INV", receipt: "RCT", credit_note: "CN", debit_note: "DN" };

export const docStatus = (d: EfrisDocument) =>
  d.status === "issued_live" ? { label: "Issued by EFRIS", cls: "bg-positive-soft text-positive" }
  : d.status === "rejected_live" ? { label: "Rejected by EFRIS", cls: "bg-negative-soft text-negative-strong" }
  : d.status === "ready" ? { label: "Ready · not sent to URA", cls: "bg-ai-soft text-ai-strong" }
  : { label: "Draft", cls: "bg-muted text-muted-foreground" };

interface ItemLine { product_id: string; name: string; qty: number; unit_price: number; vat_category: string }

const EfrisPanel = ({ data }: { data: TaxData }) => {
  const { profile, products, documents } = data;
  const [newProd, setNewProd] = useState({ name: "", unit: "pcs", unit_price: "", vat_category: "standard", kind: "product", item_code: "" });
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<EfrisDocument | null>(null);
  const [doc, setDoc] = useState({ doc_type: "receipt", customer_type: "consumer", customer_name: "", customer_tin: "", customer_brn: "", customer_nin: "", related_document_id: "", reason: "" });
  const [lines, setLines] = useState<ItemLine[]>([]);

  const include = profile?.prices_include_vat ?? true;
  const totals = useMemo(() => {
    let subtotal = 0, vat = 0;
    for (const l of lines) {
      const amt = l.qty * l.unit_price;
      const v = l.vat_category === "standard" ? (include ? (amt * VAT.standardRate) / (1 + VAT.standardRate) : amt * VAT.standardRate) : 0;
      vat += v; subtotal += include ? amt - v : amt;
    }
    return { subtotal: Math.round(subtotal), vat: Math.round(vat), total: Math.round(subtotal + vat) };
  }, [lines, include]);

  const addProduct = async () => {
    if (!newProd.name.trim()) return toast.error("Give the item a name");
    const { error } = await saveProduct({ ...newProd, name: newProd.name.trim(), unit_price: Number(newProd.unit_price) || 0 });
    if (error) return toast.error(error.message);
    setNewProd({ name: "", unit: "pcs", unit_price: "", vat_category: "standard", kind: "product", item_code: "" });
    data.reload();
  };

  const nextNumber = (type: string) => {
    const n = documents.filter((d) => d.doc_type === type).length + 1;
    return `${PREFIX[type]}-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  };

  const saveDoc = async (status: "draft" | "ready") => {
    const isNote = doc.doc_type === "credit_note" || doc.doc_type === "debit_note";
    if (!lines.length) return toast.error("Add at least one item");
    if (status === "ready") {
      if (isNote && (!doc.related_document_id || !doc.reason)) return toast.error("Notes need the original invoice and a reason");
      if (doc.customer_type === "business" && !/^\d{10}$/.test(doc.customer_tin)) return toast.error("Business customers need a 10-digit TIN");
      if (!profile?.tin) return toast.error("Add your own TIN in Business details first");
    }
    const { error } = await saveDocument({
      doc_type: doc.doc_type, local_number: nextNumber(doc.doc_type), customer_type: doc.customer_type,
      customer_name: doc.customer_name || null, customer_tin: doc.customer_tin || null, customer_brn: doc.customer_brn || null, customer_nin: doc.customer_nin || null,
      related_document_id: isNote ? doc.related_document_id || null : null, reason: isNote ? doc.reason || null : null,
      items: lines as unknown as never, subtotal: totals.subtotal, vat_amount: totals.vat, total: totals.total, status,
    });
    if (error) return toast.error(error.message);
    toast.success(status === "ready" ? "Prepared. Not sent to URA (live EFRIS not connected)." : "Draft saved");
    setOpen(false); setLines([]); data.reload();
  };

  const originals = documents.filter((d) => d.doc_type === "invoice" || d.doc_type === "receipt");
  const isNote = doc.doc_type === "credit_note" || doc.doc_type === "debit_note";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["EFRIS registration", profile?.efris_status === "registered" ? "Registered" : profile?.efris_status === "applied" ? "Applied" : "Not registered"],
          ["TIN", profile?.tin || "Missing"],
          ["VAT status", profile?.vat_status === "registered" ? "Registered" : profile?.vat_status === "not_registered" ? "Not registered" : "Not set"],
          ["Live connection", "Not connected"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="font-semibold mt-1">{v}</p></div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Kashie prepares EFRIS-ready documents. Until a live URA connection is set up, nothing is sent to URA and no FDN is issued.</p>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Products & services catalogue</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <Input className="col-span-2" placeholder="Name" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} />
          <Input placeholder="Unit price" inputMode="numeric" value={newProd.unit_price} onChange={(e) => setNewProd({ ...newProd, unit_price: e.target.value })} />
          <Input placeholder="Unit" value={newProd.unit} onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })} />
          <Select value={newProd.vat_category} onValueChange={(v) => setNewProd({ ...newProd, vat_category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="standard">VAT 18%</SelectItem><SelectItem value="zero">Zero-rated</SelectItem><SelectItem value="exempt">Exempt</SelectItem></SelectContent>
          </Select>
          <Button onClick={addProduct}><Plus className="w-4 h-4" />Add</Button>
        </div>
        {products.length === 0 ? <p className="text-sm text-muted-foreground">No items yet. Add what you sell.</p> : (
          <ul className="divide-y divide-border text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                <span>{p.name} <span className="text-muted-foreground">· {formatMoney(Number(p.unit_price))}/{p.unit} · {p.vat_category === "standard" ? "VAT 18%" : p.vat_category}</span></span>
                <Button size="icon" variant="ghost" aria-label={`Remove ${p.name}`} onClick={async () => { await deleteProduct(p.id); data.reload(); }}><Trash2 className="w-4 h-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Invoices, receipts & notes</h2>
          <Button onClick={() => setOpen(true)} disabled={!products.length}><FileText className="w-4 h-4" />Prepare document</Button>
        </div>
        {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents prepared yet.</p> : (
          <ul className="divide-y divide-border text-sm">
            {documents.map((d) => {
              const s = docStatus(d);
              return (
                <li key={d.id}>
                  <button className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-accent/40 rounded-lg px-2" onClick={() => setViewing(d)}>
                    <span><span className="font-medium">{d.local_number}</span> <span className="text-muted-foreground">· {DOC_LABEL[d.doc_type]} · {d.customer_name || "Walk-in customer"} · {d.issue_date}</span></span>
                    <span className="flex items-center gap-2"><span className="tabular-nums">{formatMoney(Number(d.total))}</span><Badge className={`${s.cls} border-0`}>{s.label}</Badge></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Prepare EFRIS document</DialogTitle><DialogDescription>Saved in Kashie only. It won't be sent to URA.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Type</Label>
                <Select value={doc.doc_type} onValueChange={(v) => setDoc({ ...doc, doc_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DOC_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1"><Label>Customer</Label>
                <Select value={doc.customer_type} onValueChange={(v) => setDoc({ ...doc, customer_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="consumer">Individual</SelectItem><SelectItem value="business">Business</SelectItem><SelectItem value="government">Government</SelectItem><SelectItem value="foreigner">Foreigner</SelectItem></SelectContent></Select>
              </div>
            </div>
            <Input placeholder="Customer name (optional for walk-ins)" value={doc.customer_name} onChange={(e) => setDoc({ ...doc, customer_name: e.target.value })} />
            {doc.customer_type !== "consumer" && <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Customer TIN" value={doc.customer_tin} onChange={(e) => setDoc({ ...doc, customer_tin: e.target.value })} />
              <Input placeholder="Customer BRN" value={doc.customer_brn} onChange={(e) => setDoc({ ...doc, customer_brn: e.target.value })} />
            </div>}
            {doc.customer_type === "consumer" && <Input placeholder="Customer NIN (optional)" value={doc.customer_nin} onChange={(e) => setDoc({ ...doc, customer_nin: e.target.value })} />}
            {isNote && <>
              <Select value={doc.related_document_id} onValueChange={(v) => setDoc({ ...doc, related_document_id: v })}>
                <SelectTrigger><SelectValue placeholder="Original invoice or receipt" /></SelectTrigger>
                <SelectContent>{originals.map((o) => <SelectItem key={o.id} value={o.id}>{o.local_number}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Reason (e.g. goods returned)" value={doc.reason} onChange={(e) => setDoc({ ...doc, reason: e.target.value })} />
            </>}
            <div className="space-y-2">
              <Label>Items</Label>
              {lines.map((l, i) => (
                <div key={i} className="flex gap-2 items-center text-sm">
                  <span className="flex-1 truncate">{l.name}</span>
                  <Input className="w-16" inputMode="numeric" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) || 0 } : x))} />
                  <Input className="w-28" inputMode="numeric" value={l.unit_price} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, unit_price: Number(e.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" aria-label="Remove item" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Select value="" onValueChange={(id) => { const p = products.find((x) => x.id === id)!; setLines([...lines, { product_id: p.id, name: p.name, qty: 1, unit_price: Number(p.unit_price), vat_category: p.vat_category }]); }}>
                <SelectTrigger><SelectValue placeholder="+ Add item from catalogue" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-xl bg-muted p-3 text-sm space-y-1 tabular-nums">
              <div className="flex justify-between"><span>Before VAT</span><span>{formatMoney(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>{formatMoney(totals.vat)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => saveDoc("draft")}>Save draft</Button>
              <Button onClick={() => saveDoc("ready")}>Mark ready</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-md">
          {viewing && <>
            <DialogHeader><DialogTitle>{DOC_LABEL[viewing.doc_type]} {viewing.local_number}</DialogTitle><DialogDescription>{docStatus(viewing).label}</DialogDescription></DialogHeader>
            <div className="text-sm space-y-2">
              <p>{viewing.customer_name || "Walk-in customer"}{viewing.customer_tin ? ` · TIN ${viewing.customer_tin}` : ""}</p>
              <p className="tabular-nums">Total {formatMoney(Number(viewing.total))} (VAT {formatMoney(Number(viewing.vat_amount))})</p>
              <div className="rounded-xl border border-dashed border-border p-3 space-y-1">
                {[["FDN", viewing.fdn], ["Verification code", viewing.verification_code], ["QR code", viewing.qr_code]].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2"><span className="text-muted-foreground">{l}</span><span className="flex items-center gap-1">{v || <><Clock className="w-3.5 h-3.5" />Awaiting live EFRIS</>}</span></div>
                ))}
              </div>
              {viewing.status === "draft" && <Button size="sm" onClick={async () => { const { error } = await saveDocument({ id: viewing.id, doc_type: viewing.doc_type, local_number: viewing.local_number, status: "ready" }); if (error) toast.error(error.message); setViewing(null); data.reload(); }}>Mark ready</Button>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EfrisPanel;
