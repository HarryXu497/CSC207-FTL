import type { Document } from 'src/entities';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * True when `quote` appears in `chunk`, ignoring case, spacing and punctuation. This is how invented
 * evidence from the model is caught.
 */
export function quoteAppearsIn(quote: string, chunk: string): boolean {
  const needle = normalize(quote);
  return needle.length > 0 && normalize(chunk).includes(needle);
}

/** File a chunk came from: `metadata.source`, else the prefix of its `{source}::{n}` id. */
export function sourceOf(doc: Document): string {
  const fromMetadata = doc.metadata?.source;
  if (typeof fromMetadata === 'string' && fromMetadata !== '') {
    return fromMetadata;
  }
  if (doc.id) {
    const cut = doc.id.lastIndexOf('::');
    return cut > 0 ? doc.id.slice(0, cut) : doc.id;
  }
  return 'unknown';
}
