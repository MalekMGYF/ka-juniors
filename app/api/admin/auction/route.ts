import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { getAdminFromCookies } from "../../../../lib/auth";
import { settleAuctionIfNeeded } from "../../../../lib/auction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: auctionsRaw } = await supabase
    .from("auctions")
    .select("*")
    .order("created_at", { ascending: false });

  const auctions: any[] = [];
  for (const raw of auctionsRaw || []) {
    const settled = await settleAuctionIfNeeded(supabase, raw);

    const { data: bids } = await supabase
      .from("auction_bids")
      .select("id, amount, created_at, users(nickname)")
      .eq("auction_id", settled.id)
      .order("amount", { ascending: false });

    let winnerNickname: string | null = null;
    if (settled.settled && settled.winner_user_id) {
      const { data: winnerUser } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", settled.winner_user_id)
        .maybeSingle();
      winnerNickname = winnerUser?.nickname || null;
    }

    auctions.push({
      ...settled,
      winnerNickname,
      bids: (bids || []).map((b: any) => ({
        id: b.id,
        amount: b.amount,
        created_at: b.created_at,
        nickname: b.users?.nickname || "؟"
      }))
    });
  }

  return NextResponse.json({ auctions });
}

export async function POST(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { itemName, itemDescription, endTime } = await req.json();
  if (!itemName || !itemName.trim() || !endTime) {
    return NextResponse.json({ error: "اكتب اسم الجايزة ومعاد الانتهاء" }, { status: 400 });
  }

  const parsedEnd = new Date(endTime);
  if (isNaN(parsedEnd.getTime())) {
    return NextResponse.json({ error: "معاد الانتهاء غير صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("auctions").insert({
    item_name: itemName.trim(),
    item_description: (itemDescription || "").trim(),
    end_time: parsedEnd.toISOString(),
    settled: false
  });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!getAdminFromCookies()) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { auctionId } = await req.json();
  if (!auctionId) {
    return NextResponse.json({ error: "مفيش مزاد محدد" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.from("auctions").delete().eq("id", auctionId);

  if (error) {
    return NextResponse.json({ error: "حصل خطأ" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
