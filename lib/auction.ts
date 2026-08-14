// منطق قفل المزاد وإعلان الفايز بيتنفذ لحظة أي قراءة (GET) لو الوقت خلص،
// من غير أي cron job. الدالة دي مشتركة بين API الطلاب و API الأدمن.
export async function settleAuctionIfNeeded(supabase: any, auction: any) {
  if (!auction || auction.settled) return auction;

  const isOver = new Date(auction.end_time).getTime() <= Date.now();
  if (!isOver) return auction;

  const { data: topBid } = await supabase
    .from("auction_bids")
    .select("id, user_id, amount")
    .eq("auction_id", auction.id)
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (topBid) {
    const { data: winner } = await supabase
      .from("users")
      .select("coins")
      .eq("id", topBid.user_id)
      .maybeSingle();

    if (winner) {
      const newCoins = Math.max(0, (winner.coins || 0) - topBid.amount);
      await supabase.from("users").update({ coins: newCoins }).eq("id", topBid.user_id);
    }

    await supabase
      .from("auctions")
      .update({
        settled: true,
        winner_user_id: topBid.user_id,
        winning_amount: topBid.amount
      })
      .eq("id", auction.id);

    return {
      ...auction,
      settled: true,
      winner_user_id: topBid.user_id,
      winning_amount: topBid.amount
    };
  }

  await supabase.from("auctions").update({ settled: true }).eq("id", auction.id);
  return { ...auction, settled: true };
}
