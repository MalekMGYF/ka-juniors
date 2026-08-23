import type { SupabaseClient } from "@supabase/supabase-js";
import { mafiosoChannelName } from "./mafioso-channel";

export async function broadcastMafiosoEvent(supabase: SupabaseClient, code: string, event: string, payload: Record<string, unknown>) {
  try {
    const channel = supabase.channel(mafiosoChannelName(code), { config: { broadcast: { ack: true } } });
    const delivered = await new Promise<boolean>((resolve) => {
      let settled = false;
      const done = (value: boolean) => { if (!settled) { settled = true; resolve(value); } };
      const timeout = setTimeout(() => done(false), 2500);
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // The channel is only a wake-up signal. Sensitive room data stays behind
          // the protected API snapshot, which checks membership before returning it.
          const result = await channel.send({ type: "broadcast", event, payload: { event } });
          clearTimeout(timeout);
          done(result === "ok");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          done(false);
        }
      });
    });
    await supabase.removeChannel(channel);
    return delivered;
  } catch {
    return false;
  }
}
