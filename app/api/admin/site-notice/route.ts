import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";
import { getSiteNoticeConfig } from "../../../../lib/site-notice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  return noStoreJson({ notice: await getSiteNoticeConfig() });
}

export async function POST(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const enabled = body.enabled === true;
  const message = typeof body.message === "string" ? body.message.trim().replace(/\s+/g, " ") : "";
  const buttonLabel = typeof body.buttonLabel === "string" ? body.buttonLabel.trim().replace(/\s+/g, " ") : "";
  if (enabled && !message) return noStoreJson({ error: "اكتب رسالة التنبيه الأول" }, { status: 400 });
  if (message.length > 500 || buttonLabel.length > 32) return noStoreJson({ error: "الرسالة أو نص الزر أطول من المسموح" }, { status: 400 });

  const notice = { enabled, message, buttonLabel: buttonLabel || "تمام", version: String(Date.now()) };
  const { error } = await supabaseServer().from("site_settings").upsert({ key: "site_notice", value: JSON.stringify(notice) });
  if (error) return noStoreJson({ error: "حصل خطأ أثناء حفظ التنبيه" }, { status: 500 });
  return noStoreJson({ notice });
}
