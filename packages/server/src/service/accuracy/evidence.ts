/** Lowercases and collapses whitespace/punctuation so a quote survives trivial formatting drift. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * True when `quote` appears in `chunk`. The judge must quote the document; checking that the quote
 * is really there is how we catch invented evidence.
 */
export function quoteAppearsIn(quote: string, chunk: string): boolean {
  const needle = normalize(quote);
  return needle.length > 0 && normalize(chunk).includes(needle);
}
