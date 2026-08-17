import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { noStoreJson } from "../../../lib/api-response";
import { SCHOOLS } from "../../../lib/schools";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return noStoreJson({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { count: totalStudents } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  const { count: totalCorrectGuesses } = await supabase
    .from("guesses")
    .select("id", { count: "exact", head: true })
    .eq("correct", true);

  const { count: totalChatMessages } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true });

  const { data: cheerTaps } = await supabase.from("cheer_taps").select("school");
  const cheerCounts: Record<string, number> = {};
  (cheerTaps || []).forEach((t) => {
    cheerCounts[t.school] = (cheerCounts[t.school] || 0) + 1;
  });

  let topSchool: { name: string; count: number } | null = null;
  for (const s of SCHOOLS) {
    const c = cheerCounts[s.name] || 0;
    if (!topSchool || c > topSchool.count) topSchool = { name: s.name, count: c };
  }

  return noStoreJson({
    totalStudents: totalStudents || 0,
    totalCorrectGuesses: totalCorrectGuesses || 0,
    totalChatMessages: totalChatMessages || 0,
    topSchool
  });
}
