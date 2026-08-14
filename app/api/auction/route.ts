import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";
import { getSessionFromCookies } from "../../../lib/auth";
import { settleAuctionIfNeeded } from "../../../lib/auction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadCurrentAuction(supabase: any) {
  const { data } = await supabase
    .from("auctions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return settleAuctionIfNeeded(supabase, data);
}

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const supabase = supabaseServer();
  const auction = await loadCurrentAuction(supabase);

  if (!auction) {
    return NextResponse.json({ auction: null });
  }

  const { data: topBid } = await supabase
    .from("auction_bids")
    .select("amount, user_id, users(nickname)")
    .eq("auction_id", auction.id)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let winnerNickname: string | null = null;
  if (auction.settled && auction.winner_user_id) {
    const { data: winnerUser } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", auction.winner_user_id)
      .maybeSingle();
    winnerNickname = winnerUser?.nickname || null;
  }

  const { data: myBid } = await supabase
    .from("auction_bids")
    .select("amount")
    .eq("auction_id", auction.id)
    .eq("user_id", session.userId)
    .order("amount", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    auction: {
      id: auction.id,
      itemName: auction.item_name,
      itemDescription: auction.item_description,
      endTime: auction.end_time,
      settled: auction.settled,
      winnerNickname,
      winningAmount: auction.winning_amount
    },
    topBid: topBid ? { amount: topBid.amount, nickname: (topBid as any).users?.nickname } : null,
    myHighestBid: myBid?.amount || null
  });
}

export async function POST(req: NextRequest) {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "لازم تسجل دخول" }, { status: 401 });
  }

  const { amount } = await req.json();
  const bidAmount = Number(amount);
  if (!bidAmount || bidAmount <= 0 || !Number.isInteger(bidAmount)) {
    return NextResponse.json({ error: "اكتب عدد كوينات صحيح" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const auction = await loadCurrentAuction(supabase);

  if (!auction) {
    return NextResponse.json({ error: "مفيش مزاد شغال دلوقتي" }, { status: 404 });
  }
  if (auction.settled) {
    return NextResponse.json({ error: "المزاد ده اتقفل خلاص" }, { status: 409 });
  }

  const { data: topBid } = await supabase
    .from("auction_bids")
    .select("amount")
    .eq("auction_id", auction.id)
    .order("amount", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topBid && bidAmount <= topBid.amount) {
    return NextResponse.json(
      { error: `لازم تزايد بأكتر من ${topBid.amount} كوين` },
      { status: 400 }
    );
  }

  const { data: me } = await supabase
    .from("users")
    .select("coins")
    .eq("id", session.userId)
    .maybeSingle();

  if (!me || me.coins < bidAmount) {
    return NextResponse.json({ error: "معندكش كوينات كفاية للمزايدة دي" }, { status: 402 });
  }

  const { error } = await supabase.from("auction_bids").insert({
    auction_id: auction.id,
    user_id: session.userId,
    amount: bidAmount
  });

  if (error) {
    return NextResponse.json({ error: "حصل خطأ، جرب تاني" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
