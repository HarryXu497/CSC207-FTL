export function messageAnchorId(messageId: string): string {
  return `message-${messageId}`;
}

export function messageAnchorHref(messageId: string): string {
  return `#${encodeURIComponent(messageAnchorId(messageId))}`;
}
