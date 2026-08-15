
import { supabaseServer } from "../../../lib/supabase";
import { noStoreJson } from "../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NoticeConfig = { enabled: boolean; message: string; buttonLabel: string; version: string };
const emptyNotice: NoticeConfig = { enabled: false, message: "", buttonLabel: "تمام", version: "" };

export async function getSiteNoticeConfig(): Promise<NoticeConfig> {
  const { data } = await supabaseServer().from("site_settings").select("value").eq("key", "site_notice").maybeSingle();
  if (!data?.value) return emptyNotice;
  try {
    const parsed = JSON.parse(data.value) as Partial<NoticeConfig>;
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

export async function GET() {
  const notice = await getSiteNoticeConfig();
  return noStoreJson({ notice });
}
