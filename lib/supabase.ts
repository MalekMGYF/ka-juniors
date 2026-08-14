import { createClient } from "@supabase/supabase-js";

// هذا الملف يشتغل على السيرفر بس، بيستخدم مفتاح service role اللي عنده صلاحية كاملة
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!url || !key) {
    throw new Error("Supabase env vars مش مظبوطة");
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
