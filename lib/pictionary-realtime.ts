// Server-side Realtime broadcaster: uses the existing service-role Supabase client only on the server.

import type { SupabaseClient } from "@supabase/supabase-js";
import { pictionaryChannelName } from "./pictionary-channel";

type RealtimePayload = Record<string, unknown>;

export async function broadcastPictionaryEvent(
  supabase: SupabaseClient,
  code: string,
  event: string,
  payload: RealtimePayload
) {
  try {
    const channel = supabase.channel(pictionaryChannelName(code), {
      config: { broadcast: { ack: true } }
    });

    const delivered = await new Promise<boolean>((resolve) => {
      let finished = false;
      const finish = (value: boolean) => {
        if (finished) return;
        finished = true;
        resolve(value);
      };
      const timeout = setTimeout(() => finish(false), 2500);

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const result = await channel.send({ type: "broadcast", event, payload });
          clearTimeout(timeout);
          finish(result === "ok");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          finish(false);
        }
      });
    });

    await supabase.removeChannel(channel);
    return delivered;
  } catch {
    return false;
  }
}
