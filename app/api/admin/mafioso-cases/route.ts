import { NextRequest } from "next/server";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";
import { supabaseServer } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg"]);
type RoleInput = { roleName: string; publicMotive: string; privateCardText: string; alignment: "mafia" | "innocent" };

function extensionFor(mimeType: string) { if (mimeType === "audio/mpeg") return "mp3"; if (mimeType === "audio/mp4") return "m4a"; if (mimeType === "audio/ogg") return "ogg"; return "wav"; }
function validAudioSignature(buffer: Buffer, mimeType: string) {
  const starts = (...bytes: number[]) => buffer.length >= bytes.length && bytes.every((value, index) => buffer[index] === value);
  if (mimeType === "audio/mpeg") return starts(0x49, 0x44, 0x33) || (buffer.length > 1 && buffer[0] === 0xff && [0xfb, 0xf3, 0xf2].includes(buffer[1]));
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE";
  if (mimeType === "audio/ogg") return starts(0x4f, 0x67, 0x67, 0x53);
  return mimeType === "audio/mp4" && buffer.length >= 12 && buffer.subarray(4, 8).toString() === "ftyp";
}
function parseRoles(raw: FormDataEntryValue | null): RoleInput[] | null {
  try {
    const value = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(value) || value.length !== 5) return null;
    const roles = value.map((item) => ({ roleName: String(item?.roleName || "").trim(), publicMotive: String(item?.publicMotive || "").trim(), privateCardText: String(item?.privateCardText || "").trim(), alignment: item?.alignment }));
    if (roles.some((role) => !role.roleName || role.roleName.length > 60 || !role.publicMotive || role.publicMotive.length > 500 || !role.privateCardText || role.privateCardText.length > 1000 || !["mafia", "innocent"].includes(role.alignment))) return null;
    if (roles.filter((role) => role.alignment === "mafia").length !== 2 || new Set(roles.map((role) => role.roleName)).size !== 5) return null;
    return roles as RoleInput[];
  } catch { return null; }
}
function parseClues(raw: FormDataEntryValue | null): string[] | null {
  try {
    const clues = JSON.parse(String(raw || "[]"));
    if (!Array.isArray(clues) || clues.length !== 4) return null;
    const normalized = clues.map((item) => String(item || "").trim());
    return normalized.every((clue) => clue.length >= 4 && clue.length <= 500) ? normalized : null;
  } catch { return null; }
}
async function uploadRevealAudio(file: File | null, folder: string) {
  if (!file || !file.size) return null;
  const mimeType = file.type.toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) throw new Error("ارفع MP3 أو M4A أو WAV أو OGG فقط");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("الفويس أوفر كبير جدًا؛ الحد الأقصى 5 ميجابايت");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validAudioSignature(buffer, mimeType)) throw new Error("ملف الصوت غير صالح");
  const path = `reveal/${folder}/voiceover.${extensionFor(mimeType)}`;
  const { error } = await supabaseServer().storage.from("mafioso-media").upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error("تعذر رفع الفويس أوفر. تأكد من تشغيل SQL مافيوسو أولًا");
  return path;
}
async function removeAudio(paths: Array<string | null | undefined>) { const valid = paths.filter((path): path is string => Boolean(path)); if (valid.length) await supabaseServer().storage.from("mafioso-media").remove(valid); }
async function hasOpenRoom(caseId: string) {
  const supabase = supabaseServer();
  const liveStatuses = ["waiting", "role_reveal", "boss_intro", "clue_reveal", "discussion", "vote_announcement", "voting", "vote_result"];
  const { data: rooms, error: roomError } = await supabase.from("mafioso_rooms").select("id").eq("case_id", caseId).in("status", liveStatuses);
  if (roomError) throw new Error("تعذر فحص الرومات المرتبطة بالقضية");
  const roomIds = (rooms || []).map((room) => room.id);
  if (!roomIds.length) return false;
  const { data: connected, error: playersError } = await supabase.from("mafioso_room_players").select("room_id").in("room_id", roomIds).eq("is_connected", true);
  if (playersError) throw new Error("تعذر فحص لاعبي الرومات المرتبطة بالقضية");
  const connectedRoomIds = new Set((connected || []).map((player) => player.room_id));
  const abandonedRoomIds = roomIds.filter((roomId) => !connectedRoomIds.has(roomId));
  if (abandonedRoomIds.length) {
    const { error: closeError } = await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: null, phase_ends_at: new Date().toISOString() }).in("id", abandonedRoomIds);
    if (closeError) throw new Error("تعذر إغلاق الرومات الفارغة");
  }
  return connectedRoomIds.size > 0;
}
function publicCases(rows: any[]) {
  return rows.map((row) => ({ ...row, roles: (row.mafioso_case_roles || []).sort((a: any, b: any) => a.sort_order - b.sort_order), clues: (row.mafioso_case_clues || []).sort((a: any, b: any) => a.round_number - b.round_number) }));
}

export async function GET() {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const { data, error } = await supabaseServer().from("mafioso_cases").select("id,title,subtitle,briefing,reveal_title,reveal_story,reveal_audio_path,is_active,created_at,mafioso_case_roles(id,role_name,public_motive,private_card_text,alignment,sort_order),mafioso_case_clues(id,round_number,clue_text)").order("created_at", { ascending: false });
  if (error) return noStoreJson({ error: "شغّل SQL مافيوسو في Supabase الأول" }, { status: 500 });
  return noStoreJson({ cases: publicCases(data || []) });
}

export async function POST(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const form = await req.formData();
  const title = String(form.get("title") || "").trim(); const subtitle = String(form.get("subtitle") || "").trim(); const briefing = String(form.get("briefing") || "").trim(); const revealTitle = String(form.get("revealTitle") || "الحقيقة الكاملة").trim(); const revealStory = String(form.get("revealStory") || "").trim();
  const roles = parseRoles(form.get("roles")); const clues = parseClues(form.get("clues")); const audio = form.get("revealAudio"); const isActive = String(form.get("isActive")) !== "false";
  if (title.length < 3 || title.length > 90 || subtitle.length > 300 || briefing.length > 1200 || revealTitle.length < 3 || revealTitle.length > 120 || revealStory.length < 10 || revealStory.length > 3500 || !roles || !clues) return noStoreJson({ error: "اكتب بيانات القضية و5 شخصيات (2 مافيوسو) و4 أدلة بشكل كامل" }, { status: 400 });
  const caseId = crypto.randomUUID(); let audioPath: string | null = null;
  try {
    audioPath = await uploadRevealAudio(audio instanceof File ? audio : null, caseId);
    const supabase = supabaseServer();
    const { error: caseError } = await supabase.from("mafioso_cases").insert({ id: caseId, title, subtitle, briefing, reveal_title: revealTitle, reveal_story: revealStory, reveal_audio_path: audioPath, is_active: isActive });
    if (caseError) throw new Error("تعذر حفظ القضية");
    const { error: roleError } = await supabase.from("mafioso_case_roles").insert(roles.map((role, index) => ({ case_id: caseId, role_name: role.roleName, public_motive: role.publicMotive, private_card_text: role.privateCardText, alignment: role.alignment, sort_order: index + 1 })));
    if (roleError) throw new Error("تعذر حفظ الشخصيات");
    const { error: clueError } = await supabase.from("mafioso_case_clues").insert(clues.map((clue, index) => ({ case_id: caseId, round_number: index + 1, clue_text: clue })));
    if (clueError) throw new Error("تعذر حفظ الأدلة");
    return noStoreJson({ success: true });
  } catch (error) { await supabaseServer().from("mafioso_cases").delete().eq("id", caseId); await removeAudio([audioPath]); return noStoreJson({ error: error instanceof Error ? error.message : "حصل خطأ أثناء حفظ القضية" }, { status: 400 }); }
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const form = await req.formData(); const caseId = String(form.get("caseId") || "").trim();
  const title = String(form.get("title") || "").trim(); const subtitle = String(form.get("subtitle") || "").trim(); const briefing = String(form.get("briefing") || "").trim(); const revealTitle = String(form.get("revealTitle") || "الحقيقة الكاملة").trim(); const revealStory = String(form.get("revealStory") || "").trim(); const isActive = String(form.get("isActive")) === "true"; const removeReveal = String(form.get("removeReveal")) === "true";
  const roles = parseRoles(form.get("roles")); const clues = parseClues(form.get("clues")); const audio = form.get("revealAudio");
  if (!caseId || title.length < 3 || title.length > 90 || subtitle.length > 300 || briefing.length > 1200 || revealTitle.length < 3 || revealTitle.length > 120 || revealStory.length < 10 || revealStory.length > 3500 || !roles || !clues) return noStoreJson({ error: "بيانات القضية غير مكتملة" }, { status: 400 });
  if (await hasOpenRoom(caseId)) return noStoreJson({ error: "لا يمكن تعديل قضية مرتبطة بروم شغالة. انتظر انتهاء الرومات المرتبطة بها." }, { status: 409 });
  const supabase = supabaseServer(); const { data: existing } = await supabase.from("mafioso_cases").select("reveal_audio_path").eq("id", caseId).maybeSingle(); if (!existing) return noStoreJson({ error: "القضية غير موجودة" }, { status: 404 });
  let uploadedPath: string | null = null;
  try {
    uploadedPath = await uploadRevealAudio(audio instanceof File ? audio : null, caseId);
    const revealAudioPath = removeReveal ? null : (uploadedPath || existing.reveal_audio_path);
    const { error: updateError } = await supabase.from("mafioso_cases").update({ title, subtitle, briefing, reveal_title: revealTitle, reveal_story: revealStory, reveal_audio_path: revealAudioPath, is_active: isActive }).eq("id", caseId);
    if (updateError) throw new Error("تعذر حفظ تعديل القضية");
    const { error: deleteRoles } = await supabase.from("mafioso_case_roles").delete().eq("case_id", caseId); if (deleteRoles) throw new Error("تعذر تحديث الشخصيات");
    const { error: createRoles } = await supabase.from("mafioso_case_roles").insert(roles.map((role, index) => ({ case_id: caseId, role_name: role.roleName, public_motive: role.publicMotive, private_card_text: role.privateCardText, alignment: role.alignment, sort_order: index + 1 }))); if (createRoles) throw new Error("تعذر حفظ الشخصيات");
    const { error: deleteClues } = await supabase.from("mafioso_case_clues").delete().eq("case_id", caseId); if (deleteClues) throw new Error("تعذر تحديث الأدلة");
    const { error: createClues } = await supabase.from("mafioso_case_clues").insert(clues.map((clue, index) => ({ case_id: caseId, round_number: index + 1, clue_text: clue }))); if (createClues) throw new Error("تعذر حفظ الأدلة");
    if ((uploadedPath || removeReveal) && existing.reveal_audio_path !== revealAudioPath) await removeAudio([existing.reveal_audio_path]);
    return noStoreJson({ success: true });
  } catch (error) { await removeAudio([uploadedPath]); return noStoreJson({ error: error instanceof Error ? error.message : "حصل خطأ أثناء حفظ القضية" }, { status: 400 }); }
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const { caseId } = await req.json().catch(() => ({}));
  if (typeof caseId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) return noStoreJson({ error: "حدد قضية صحيحة الأول" }, { status: 400 });
  try {
    const supabase = supabaseServer();
    const { data: existing, error: findError } = await supabase.from("mafioso_cases").select("reveal_audio_path").eq("id", caseId).maybeSingle();
    if (findError) throw findError;
    if (!existing) return noStoreJson({ error: "القضية دي اتحذفت بالفعل أو مش موجودة" }, { status: 404 });
    const { data: relatedRooms, error: roomsError } = await supabase.from("mafioso_rooms").select("id").eq("case_id", caseId);
    if (roomsError) throw roomsError;
    const roomIds = (relatedRooms || []).map((room) => room.id);
    if (roomIds.length) {
      const { error: closeRoomsError } = await supabase.from("mafioso_rooms").update({ status: "finished", final_winner: null, phase_ends_at: new Date().toISOString() }).in("id", roomIds);
      if (closeRoomsError) throw closeRoomsError;
      const { error: disconnectError } = await supabase.from("mafioso_room_players").update({ is_connected: false, last_seen_at: new Date().toISOString() }).in("room_id", roomIds);
      if (disconnectError) throw disconnectError;
    }
    const { error: detachError } = await supabase.from("mafioso_rooms").update({ case_id: null, current_clue_id: null }).eq("case_id", caseId);
    if (detachError) throw detachError;
    const { error: rolesError } = await supabase.from("mafioso_case_roles").delete().eq("case_id", caseId);
    if (rolesError) throw rolesError;
    const { error: cluesError } = await supabase.from("mafioso_case_clues").delete().eq("case_id", caseId);
    if (cluesError) throw cluesError;
    const { error: deleteError } = await supabase.from("mafioso_cases").delete().eq("id", caseId);
    if (deleteError) throw deleteError;
    await removeAudio([existing.reveal_audio_path]);
    return noStoreJson({ success: true });
  } catch (error) {
    console.error("mafioso case deletion failed", error);
    return noStoreJson({ error: "تعذر حذف القضية. شغّل أحدث SQL مافيوسو في Supabase ثم جرّب تاني." }, { status: 500 });
  }
}
