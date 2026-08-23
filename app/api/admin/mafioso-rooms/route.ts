import { NextRequest } from "next/server";
import { getAdminFromCookies } from "../../../../lib/auth";
import { noStoreJson } from "../../../../lib/api-response";
import { supabaseServer } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ROOM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapRooms(rows: any[]) {
  return rows.map((room) => {
    const players = room.mafioso_room_players || [];
    const host = players.find((player: any) => player.user_id === room.created_by);
    const connected = players.filter((player: any) => player.is_connected).length;
    return {
      id: room.id,
      code: room.code,
      status: room.status,
      createdAt: room.created_at,
      caseTitle: room.mafioso_cases?.title || "قضية محذوفة",
      hostNickname: host?.users?.nickname || "صاحب الروم",
      connectedCount: connected,
      totalPlayers: players.length,
    };
  });
}

export async function GET() {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  try {
    const { data, error } = await supabaseServer().from("mafioso_rooms").select("id,code,status,created_by,created_at,mafioso_cases(title),mafioso_room_players(user_id,is_connected,users(nickname))").order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return noStoreJson({ rooms: mapRooms(data || []) });
  } catch (error) {
    console.error("mafioso rooms admin list failed", error);
    return noStoreJson({ error: "تعذر تحميل الرومات. شغّل SQL مافيوسو أولًا." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminFromCookies())) return noStoreJson({ error: "غير مصرح" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const clearAbandoned = body.action === "clear_abandoned";
  try {
    const supabase = supabaseServer();
    if (clearAbandoned) {
      const { data: rows, error: listError } = await supabase.from("mafioso_rooms").select("id,status,mafioso_room_players(is_connected)").limit(200);
      if (listError) throw listError;
      const ids = (rows || []).filter((room: any) => room.status === "finished" || !(room.mafioso_room_players || []).some((player: any) => player.is_connected)).map((room: any) => room.id);
      if (!ids.length) return noStoreJson({ success: true, removed: 0 });
      const { error: deleteError } = await supabase.from("mafioso_rooms").delete().in("id", ids);
      if (deleteError) throw deleteError;
      return noStoreJson({ success: true, removed: ids.length });
    }
    if (!ROOM_ID.test(roomId)) return noStoreJson({ error: "اختار روم صحيحة" }, { status: 400 });
    const { error } = await supabase.from("mafioso_rooms").delete().eq("id", roomId);
    if (error) throw error;
    return noStoreJson({ success: true });
  } catch (error) {
    console.error("mafioso rooms admin delete failed", error);
    return noStoreJson({ error: "تعذر حذف الروم. جرّب تاني." }, { status: 500 });
  }
}
