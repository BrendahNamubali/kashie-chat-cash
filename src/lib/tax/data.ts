import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type TaxProfile = T["tax_profiles"]["Row"];
export type EfrisProduct = T["efris_products"]["Row"];
export type EfrisDocument = T["efris_documents"]["Row"];
export type TaxReturn = T["tax_returns"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function getTaxProfile() {
  const { data } = await supabase.from("tax_profiles").select("*").maybeSingle();
  return data;
}
export async function saveTaxProfile(u: Partial<T["tax_profiles"]["Insert"]>) {
  const user_id = await uid();
  return supabase.from("tax_profiles").upsert({ ...u, user_id }, { onConflict: "user_id" }).select().single();
}

export async function listProducts() {
  const { data } = await supabase.from("efris_products").select("*").order("name");
  return data ?? [];
}
export async function saveProduct(p: Partial<T["efris_products"]["Insert"]> & { name: string }) {
  const user_id = await uid();
  return p.id ? supabase.from("efris_products").update(p).eq("id", p.id) : supabase.from("efris_products").insert({ ...p, user_id });
}
export async function deleteProduct(id: string) {
  return supabase.from("efris_products").delete().eq("id", id);
}

export async function listDocuments() {
  const { data } = await supabase.from("efris_documents").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
export async function saveDocument(d: Partial<T["efris_documents"]["Insert"]> & { doc_type: string; local_number: string }) {
  const user_id = await uid();
  return d.id ? supabase.from("efris_documents").update(d).eq("id", d.id) : supabase.from("efris_documents").insert({ ...d, user_id });
}

export async function listReturns() {
  const { data } = await supabase.from("tax_returns").select("*").order("period_start", { ascending: false });
  return data ?? [];
}
export async function saveReturn(r: Partial<T["tax_returns"]["Insert"]> & { return_type: string; period_start: string; period_end: string }) {
  const user_id = await uid();
  return supabase.from("tax_returns").upsert({ ...r, user_id }, { onConflict: "user_id,return_type,period_start" }).select().single();
}
