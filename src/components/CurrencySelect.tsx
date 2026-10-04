import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currency";

interface Props { value: string; onChange: (code: string) => void; id?: string }

/** Currency picker with an "Other" option that accepts any 3-letter ISO code. */
const CurrencySelect = ({ value, onChange, id }: Props) => {
  const known = CURRENCIES.some((c) => c.code === value);
  const [other, setOther] = useState(!!value && !known);
  return (
    <div className="space-y-2">
      <Select value={other ? "OTHER" : value} onValueChange={(v) => { if (v === "OTHER") { setOther(true); onChange(""); } else { setOther(false); onChange(v); } }}>
        <SelectTrigger id={id} className="h-11 rounded-xl"><SelectValue placeholder="Choose your currency" /></SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} · {c.name}</SelectItem>)}
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>
      {other && (
        <Input className="h-11 rounded-xl uppercase" maxLength={3} placeholder="3-letter code, e.g. RWF" value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
      )}
    </div>
  );
};

export const isValidCurrency = (c: string) => /^[A-Z]{3}$/.test(c);
export default CurrencySelect;
