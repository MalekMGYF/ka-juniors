import { supabaseServer } from "./supabase";

export type SiteNoticeConfig = { enabled: boolean; message: string; buttonLabel: string; version: string };

const emptyNotice: SiteNoticeConfig = { enabled: false, message: "", buttonLabel: "تمام", version: "" };

export async function getSiteNoticeConfig(): Promise<SiteNoticeConfig> {
  const { data } = await supabaseServer().from("site_settings").select("value").eq("key", "site_notice").maybeSingle();
  if (!data?.value) return emptyNotice;
  try {
    const parsed = JSON.parse(data.value) as Partial<SiteNoticeConfig>;
    return {
      enabled: parsed.enabled === true,
      message: typeof parsed.message === "string" ? parsed.message : "",
      buttonLabel: typeof parsed.buttonLabel === "string" && parsed.buttonLabel.trim() ? parsed.buttonLabel : "تمام",
      version: typeof parsed.version === "string" ? parsed.version : ""
    };
  } catch {
    return emptyNotice;
  }
}
