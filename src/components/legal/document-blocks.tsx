import { Info } from "lucide-react";
import type { DocumentBlock } from "@/lib/legal/types";

/**
 * Renders the block list of a public document section (see
 * `src/lib/legal/types.ts`). Server component — nothing here is
 * interactive, so the Privacy Policy and the static half of the Support
 * page ship no JavaScript of their own.
 */
export function DocumentBlocks({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") {
          return (
            <p key={index} className="mt-4 leading-relaxed text-muted-foreground first:mt-0">
              {block.text}
            </p>
          );
        }

        if (block.type === "note") {
          return (
            <div
              key={index}
              className="mt-4 flex gap-3 rounded-2xl border-2 border-border bg-muted/50 p-4 first:mt-0"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground">{block.text}</p>
            </div>
          );
        }

        return (
          <div key={index} className="mt-4 first:mt-0">
            {block.lead && (
              <p className="leading-relaxed text-foreground">
                <strong className="font-semibold">{block.lead}</strong>
              </p>
            )}
            <ul className="mt-2 space-y-2 pl-5">
              {block.items.map((item) => (
                <li key={item} className="list-disc leading-relaxed text-muted-foreground marker:text-primary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
