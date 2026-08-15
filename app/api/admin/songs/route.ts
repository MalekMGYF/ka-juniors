import { NextRequest } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/aac", "audio/ogg"]);

function hasValidAudioSignature(buffer: Buffer, mimeType: string) {
  const starts = (...bytes: number[]) => buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
  if (mimeType === "audio/mpeg") return starts(0x49, 0x44, 0x33) || (buffer.length > 1 && buffer[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(buffer[1]));
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE";
  if (mimeType === "audio/ogg") return starts(0x4f, 0x67, 0x67, 0x53);
  if (mimeType === "audio/aac") return buffer.length > 1 && buffer[0] === 0xff && [0xf1, 0xf9].includes(buffer[1]);
  if (mimeType === "audio/mp4") return buffer.length >= 12 && buffer.subarray(4, 8).toString() === "ftyp";
  return false;
}

function extensionFor(mimeType: string) {
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/mp4") return "m4a";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/aac") return "aac";
  return "wav";
}

async function uploadAudio(file: File | null, slot: "intro" | "full", questionFolder: string) {
  if (!file || !file.size) return null;
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_TYPES.has(mimeType)) throw new Error("ارفع MP3 أو M4A أو WAV أو AAC أو OGG فقط");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("المقطع كبير جدًا؛ الحد الأقصى 5 ميجابايت");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidAudioSignature(buffer, mimeType)) throw new Error("ملف الصوت غير صالح");
  const path = `questions/${questionFolder}/${slot}.${extensionFor(mimeType)}`;
  const supabase = supabaseServer();
  const { error } = await supabase.storage.from("song-audio").upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error("تعذر رفع المقطع الصوتي");
  return path;
}

async function removeFiles(paths: Array<string | null | undefined>) {
  const valid = paths.filter((path): path is string => Boolean(path));
  if (valid.length) await supabaseServer().storage.from("song-audio").remove(valid);
}

export async function GET() {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const supabase = supabaseServer();
  const { data: questions, error } = await supabase
    .from("song_complete_questions")
    .select("id, title, prompt_text, full_line, options, correct_index, intro_audio_path, full_audio_path, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) return noStoreJson({ error: "شغّل SQL اللعبة في Supabase الأول" }, { status: 500 });
  const ids = (questions || []).map((item) => item.id);
  const answerCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: answers } = await supabase.from("song_complete_answers").select("question_id").in("question_id", ids);
    (answers || []).forEach((answer) => { answerCounts[answer.question_id] = (answerCounts[answer.question_id] || 0) + 1; });
  }
  return noStoreJson({ questions: (questions || []).map((question) => ({ ...question, answersCount: answerCounts[question.id] || 0 })) });
}

export async function POST(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const form = await req.formData();
  const title = String(form.get("title") || "").trim();
  const promptText = String(form.get("promptText") || "").trim();
  const fullLine = String(form.get("fullLine") || "").trim();
  const options = [0, 1, 2, 3].map((index) => String(form.get(`option${index}`) || "").trim());
  const correctIndex = Number(form.get("correctIndex"));
  const introAudio = form.get("introAudio");
  const fullAudio = form.get("fullAudio");

  if (!title || !promptText || !fullLine || !promptText.includes("…")) return noStoreJson({ error: "اكتب العنوان والجملة وعلامة … مكان الجزء الناقص" }, { status: 400 });
  if (options.some((option) => !option) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return noStoreJson({ error: "اكتب الأربع اختيارات وحدد الإجابة الصح" }, { status: 400 });

  const folder = crypto.randomUUID();
  try {
    const introPath = await uploadAudio(introAudio instanceof File ? introAudio : null, "intro", folder);
    const fullPath = await uploadAudio(fullAudio instanceof File ? fullAudio : null, "full", folder);
    const { error } = await supabaseServer().from("song_complete_questions").insert({
      title,
      prompt_text: promptText,
      full_line: fullLine,
      options,
      correct_index: correctIndex,
      intro_audio_path: introPath,
      full_audio_path: fullPath,
      is_active: true
    });
    if (error) {
      await removeFiles([introPath, fullPath]);
      return noStoreJson({ error: "تعذر حفظ السؤال" }, { status: 500 });
    }
    return noStoreJson({ success: true });
  } catch (error) {
    await removeFiles([`questions/${folder}/intro.mp3`, `questions/${folder}/full.mp3`, `questions/${folder}/intro.m4a`, `questions/${folder}/full.m4a`, `questions/${folder}/intro.wav`, `questions/${folder}/full.wav`, `questions/${folder}/intro.aac`, `questions/${folder}/full.aac`, `questions/${folder}/intro.ogg`, `questions/${folder}/full.ogg`]);
    return noStoreJson({ error: error instanceof Error ? error.message : "حصل خطأ أثناء رفع الصوت" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");

  if (!isMultipart) {
    const { questionId, isActive } = await req.json().catch(() => ({}));
    if (typeof questionId !== "string" || typeof isActive !== "boolean") return noStoreJson({ error: "طلب غير صحيح" }, { status: 400 });
    const { error } = await supabaseServer().from("song_complete_questions").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", questionId);
    if (error) return noStoreJson({ error: "حصل خطأ" }, { status: 500 });
    return noStoreJson({ success: true });
  }

  const form = await req.formData();
  const questionId = String(form.get("questionId") || "").trim();
  const title = String(form.get("title") || "").trim();
  const promptText = String(form.get("promptText") || "").trim();
  const fullLine = String(form.get("fullLine") || "").trim();
  const options = [0, 1, 2, 3].map((index) => String(form.get(`option${index}`) || "").trim());
  const correctIndex = Number(form.get("correctIndex"));
  const removeIntro = String(form.get("removeIntro") || "") === "true";
  const removeFull = String(form.get("removeFull") || "") === "true";
  const introAudio = form.get("introAudio");
  const fullAudio = form.get("fullAudio");

  if (!questionId || !title || !promptText || !fullLine || !promptText.includes("…")) return noStoreJson({ error: "اكتب العنوان والجملة وعلامة … مكان الجزء الناقص" }, { status: 400 });
  if (options.some((option) => !option) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return noStoreJson({ error: "اكتب الأربع اختيارات وحدد الإجابة الصح" }, { status: 400 });

  const supabase = supabaseServer();
  const { data: existing, error: existingError } = await supabase
    .from("song_complete_questions")
    .select("intro_audio_path, full_audio_path")
    .eq("id", questionId)
    .maybeSingle();
  if (existingError || !existing) return noStoreJson({ error: "السؤال غير موجود" }, { status: 404 });

  let uploadedIntro: string | null = null;
  let uploadedFull: string | null = null;
  try {
    uploadedIntro = await uploadAudio(introAudio instanceof File ? introAudio : null, "intro", questionId);
    uploadedFull = await uploadAudio(fullAudio instanceof File ? fullAudio : null, "full", questionId);
    const nextIntro = removeIntro ? null : (uploadedIntro || existing.intro_audio_path);
    const nextFull = removeFull ? null : (uploadedFull || existing.full_audio_path);
    const { error } = await supabase.from("song_complete_questions").update({
      title,
      prompt_text: promptText,
      full_line: fullLine,
      options,
      correct_index: correctIndex,
      intro_audio_path: nextIntro,
      full_audio_path: nextFull,
      updated_at: new Date().toISOString()
    }).eq("id", questionId);
    if (error) throw new Error("تعذر حفظ تعديل السؤال");

    const stalePaths = [
      (uploadedIntro || removeIntro) && existing.intro_audio_path !== nextIntro ? existing.intro_audio_path : null,
      (uploadedFull || removeFull) && existing.full_audio_path !== nextFull ? existing.full_audio_path : null
    ];
    await removeFiles(stalePaths);
    return noStoreJson({ success: true });
  } catch (error) {
    await removeFiles([uploadedIntro, uploadedFull]);
    return noStoreJson({ error: error instanceof Error ? error.message : "حصل خطأ أثناء حفظ التعديل" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const { questionId } = await req.json().catch(() => ({}));
  if (typeof questionId !== "string") return noStoreJson({ error: "حدد السؤال الأول" }, { status: 400 });
  const supabase = supabaseServer();
  const { data: question } = await supabase.from("song_complete_questions").select("intro_audio_path, full_audio_path").eq("id", questionId).maybeSingle();
  const { error } = await supabase.from("song_complete_questions").delete().eq("id", questionId);
  if (error) return noStoreJson({ error: "حصل خطأ أثناء حذف السؤال" }, { status: 500 });
  await removeFiles([question?.intro_audio_path, question?.full_audio_path]);
  return noStoreJson({ success: true });
}
