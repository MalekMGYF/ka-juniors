// Shared channel naming keeps browser subscriptions and server broadcasts on the same room topic.
export function pictionaryChannelName(code: string) {
  return `pictionary:room:${code.toUpperCase()}`;
}
