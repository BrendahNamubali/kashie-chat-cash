import { supabase } from "@/integrations/supabase/client";

export interface DemoVersion {
  id: string;
  version_label: string;
  storage_path: string;
  notes: string | null;
  duration_seconds: number | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export const DEMO_BUCKET = "demos";

export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function getPublishedDemo(): Promise<DemoVersion | null> {
  const { data } = await supabase
    .from("demo_versions")
    .select("*")
    .eq("status", "published")
    .maybeSingle();
  return (data as DemoVersion) ?? null;
}

export async function listAllDemos(): Promise<DemoVersion[]> {
  const { data } = await supabase
    .from("demo_versions")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as DemoVersion[]) ?? [];
}

export async function getDemoSignedUrl(storage_path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DEMO_BUCKET)
    .createSignedUrl(storage_path, expiresIn, { download: false });
  if (error || !data) return null;
  return data.signedUrl;
}

export async function getDemoDownloadUrl(storage_path: string, filename = "kashie-demo.mp4"): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DEMO_BUCKET)
    .createSignedUrl(storage_path, 60 * 10, { download: filename });
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadDemoVersion(params: {
  file: File;
  version_label: string;
  notes?: string;
  publish?: boolean;
}): Promise<DemoVersion> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const safe = params.version_label.replace(/[^a-z0-9-_.]/gi, "-");
  const path = `versions/${Date.now()}-${safe}.mp4`;

  const { error: upErr } = await supabase.storage
    .from(DEMO_BUCKET)
    .upload(path, params.file, { contentType: "video/mp4", upsert: false });
  if (upErr) throw upErr;

  if (params.publish) {
    // Archive current published
    await supabase
      .from("demo_versions")
      .update({ status: "archived" })
      .eq("status", "published");
  }

  const { data, error } = await supabase
    .from("demo_versions")
    .insert({
      version_label: params.version_label,
      storage_path: path,
      notes: params.notes ?? null,
      status: params.publish ? "published" : "draft",
      created_by: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DemoVersion;
}

export async function publishDemo(id: string): Promise<void> {
  await supabase.from("demo_versions").update({ status: "archived" }).eq("status", "published");
  await supabase.from("demo_versions").update({ status: "published" }).eq("id", id);
}

export async function deleteDemoVersion(id: string, storage_path: string): Promise<void> {
  await supabase.storage.from(DEMO_BUCKET).remove([storage_path]);
  await supabase.from("demo_versions").delete().eq("id", id);
}
