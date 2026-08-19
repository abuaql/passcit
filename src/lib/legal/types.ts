/**
 * Shared shapes for the long-form public documents (Privacy Policy,
 * Support). These live here rather than in `src/lib/i18n/en.ts` on
 * purpose: en.ts is the dictionary for UI *chrome* — labels, buttons,
 * error messages — and folding several hundred lines of legal and
 * support prose into it would drown that. The documents are content,
 * modelled as data so the page components stay pure presentation and a
 * future translation is a parallel file with the same shape (exactly the
 * pattern en.ts already documents for itself).
 */

/** One renderable piece of a document section. */
export type DocumentBlock =
  | { type: "p"; text: string }
  /** Bulleted list. `lead` is an optional sentence rendered above the bullets. */
  | { type: "ul"; lead?: string; items: string[] }
  /** Visually set apart from the surrounding prose — used sparingly, for things a reader must not miss. */
  | { type: "note"; text: string };

export interface DocumentSection {
  /** Anchor id — also the key used by the on-page contents list. */
  id: string;
  heading: string;
  blocks: DocumentBlock[];
}

export interface SupportEntry {
  question: string;
  blocks: DocumentBlock[];
}

export interface SupportTopic {
  id: string;
  title: string;
  entries: SupportEntry[];
}
