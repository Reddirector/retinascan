import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* RichText — structured renderer for AI reports and chat replies      */
/*                                                                     */
/* Parses plain text into visual blocks:                               */
/*   • ALL-CAPS lines            → section headings with accent bar    */
/*   • short Title-Case lines    → subtle sub-headings                 */
/*   • "Key: value" lines        → key-value rows in a bordered card   */
/*   • • / * / - prefixed        → compact bulleted lists              */
/*   • "1." / "1)" prefixed      → numbered badge lists                */
/*   • "93.4% Confidence → ..."  → highlight callout                   */
/*   • everything else           → paragraphs                          */
/*                                                                     */
/* `wordLimit` supports word-by-word streaming while preserving the    */
/* block structure (blocks fill progressively as words are revealed).  */
/* ------------------------------------------------------------------ */

type Block =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "kv"; items: { key: string; value: string }[] }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "paragraph"; text: string };

const HEADING_RE = /^(?:#{1,4}\s+)?[A-Z][A-Z0-9 &,'()/–—-]{2,}$/;
const KV_RE = /^([A-Za-z][A-Za-z0-9 /()&.,'%+-]{1,60}?):\s*(.*)$/;
const BULLET_RE = /^(?:[•*]|-)\s+(.*)$/;
const NUMBERED_RE = /^\d{1,2}[.)]\s+(.*)$/;
const CALLOUT_RE = /^(\d+(?:\.\d+)?%.*|.*→.*)$/;
/** Short finding statements like "Microaneurysms detected" render as bullets. */
const FINDING_RE = /^[A-Z][^.!?]{0,56}\s(?:detected|present|visible|identified)\.?$/;
/** A clinical result statement like "Moderate Non-Proliferative Diabetic Retinopathy (Grade 2)". */
const RESULT_RE = /^(?:Mild|Moderate|Severe|Proliferative|No DR)\b.*\b(?:Retinopathy|NPDR|DR)\b.*$/;

function isSubheading(line: string): boolean {
  // Short (≤ 4 words), mostly alphabetic, no terminal punctuation —
  // matches things like "Vision Model", "Explainability", "Verification".
  if (line.length > 32 || line.endsWith(".")) return false;
  if (FINDING_RE.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length > 4) return false;
  return /^[A-Z][A-Za-z0-9 /&()+.,'-]*$/.test(line);
}

export function parseStructured(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let kv: { key: string; value: string }[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (kv.length) {
      blocks.push({ type: "kv", items: kv });
      kv = [];
    }
    if (bullets.length) {
      blocks.push({ type: "bullets", items: bullets });
      bullets = [];
    }
    if (numbered.length) {
      blocks.push({ type: "numbered", items: numbered });
      numbered = [];
    }
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();

    if (!line) {
      flush();
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flush();
      bullets.push(bullet[1]);
      continue;
    }

    if (FINDING_RE.test(line) && line.length <= 60) {
      flush();
      bullets.push(line.replace(/\.$/, ""));
      continue;
    }

    const numberedMatch = line.match(NUMBERED_RE);
    if (numberedMatch) {
      flush();
      numbered.push(numberedMatch[1]);
      continue;
    }

    if (HEADING_RE.test(line)) {
      flush();
      blocks.push({ type: "heading", text: line.replace(/^#{1,4}\s+/, "") });
      continue;
    }

    if (isSubheading(line)) {
      flush();
      blocks.push({ type: "subheading", text: line });
      continue;
    }

    const kvMatch = line.match(KV_RE);
    if (kvMatch) {
      flush();
      kv.push({ key: kvMatch[1].trim(), value: kvMatch[2].trim() });
      continue;
    }

    if (CALLOUT_RE.test(line) && line.length <= 80) {
      flush();
      blocks.push({ type: "callout", text: line });
      continue;
    }

    if (RESULT_RE.test(line) && line.length <= 90 && !line.endsWith(".")) {
      flush();
      blocks.push({ type: "callout", text: line });
      continue;
    }

    flush();
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/** Render markdown **bold** spans inside a text chunk. */
function renderInline(text: string) {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Take at most `n` words from `text`; returns [visibleText, wordsUsed]. */
function takeWords(text: string, n: number | undefined): [string, number] {
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  if (n === undefined) return [words.join(" "), words.length];
  const visible = words.slice(0, Math.max(0, n));
  return [visible.join(" "), visible.length];
}

const DISCLAIMER_RE =
  /^(this is an ai (screening )?assessment|not a (definitive )?(clinical )?(diagnosis|substitute)).*$/i;

export function RichText({
  text,
  className,
  wordLimit,
  streaming = false,
}: {
  text: string;
  className?: string;
  /** Total number of words to reveal (for streaming). Omit to show all. */
  wordLimit?: number;
  /** Shows a typing caret when true. */
  streaming?: boolean;
}) {
  const blocks = parseStructured(text);
  let remaining = wordLimit;

  const available = () => (remaining === undefined ? Infinity : remaining);
  const use = (n: number) => {
    if (remaining !== undefined) remaining = Math.max(0, remaining - n);
  };

  // A trailing disclaimer line renders as a quiet footnote instead of body text.
  const last = blocks.length > 0 ? blocks[blocks.length - 1] : null;
  const isDisclaimer =
    last?.type === "paragraph" && DISCLAIMER_RE.test(last.text);

  return (
    <div
      className={cn(
        "space-y-3 text-[13px] leading-relaxed text-foreground",
        className,
      )}
    >
      {blocks.map((block, bi) => {
        if (available() <= 0) return null;

        if (isDisclaimer && block === last) {
          const [visible, used] = takeWords(block.text, remaining);
          if (used === 0) return null;
          use(used);
          return (
            <p
              key={bi}
              className="flex items-start gap-1.5 border-t pt-3 text-[11px] italic text-muted-foreground"
            >
              <Info className="mt-0.5 size-3 shrink-0" />
              {visible}
            </p>
          );
        }

        switch (block.type) {
          case "heading": {
            const [visible, used] = takeWords(block.text, remaining);
            if (used === 0) return null;
            use(used);
            return (
              <div key={bi} className="flex items-center gap-2 pt-3 first:pt-0">
                <span className="h-3.5 w-1 shrink-0 rounded-full bg-blue-500" />
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  {visible}
                </h4>
              </div>
            );
          }

          case "subheading": {
            const [visible, used] = takeWords(block.text, remaining);
            if (used === 0) return null;
            use(used);
            return (
              <h5
                key={bi}
                className="pt-1 text-[12px] font-semibold text-foreground"
              >
                {visible}
              </h5>
            );
          }

          case "kv": {
            const rows: { key: string; value: string }[] = [];
            for (const item of block.items) {
              if (available() <= 0) break;
              const keyWords = item.key.trim().split(/\s+/).length;
              if (available() < keyWords) {
                const [visibleKey, usedKey] = takeWords(item.key, remaining);
                if (usedKey > 0) {
                  rows.push({ key: visibleKey, value: "" });
                  use(usedKey);
                }
                break;
              }
              use(keyWords);
              const [visibleValue, usedValue] = takeWords(item.value, remaining);
              use(usedValue);
              rows.push({ key: item.key, value: visibleValue });
            }
            if (rows.length === 0) return null;
            return (
              <dl
                key={bi}
                className="divide-y overflow-hidden rounded-lg border bg-muted/40"
              >
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between gap-4 px-3 py-2"
                  >
                    <dt className="shrink-0 text-xs text-muted-foreground">
                      {r.key}
                    </dt>
                    <dd
                      className={cn(
                        "text-right text-[13px] font-semibold",
                        /^REFERABLE/i.test(r.value) &&
                          "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700",
                        /^[\d.,%\s]+$/.test(r.value) && "nb-mono",
                      )}
                    >
                      {renderInline(r.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            );
          }

          case "bullets": {
            const items: string[] = [];
            for (const item of block.items) {
              if (available() <= 0) break;
              const [visible, used] = takeWords(item, remaining);
              if (used === 0) break;
              use(used);
              items.push(visible);
            }
            if (items.length === 0) return null;
            const negative = (s: string) => /^no\s/i.test(s);
            return (
              <ul key={bi} className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-[7px] size-1.5 shrink-0 rounded-full",
                        negative(item) ? "bg-emerald-500" : "bg-teal-500",
                      )}
                    />
                    <span className="min-w-0">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );
          }

          case "numbered": {
            const items: string[] = [];
            for (const item of block.items) {
              if (available() <= 0) break;
              const [visible, used] = takeWords(item, remaining);
              if (used === 0) break;
              use(used);
              items.push(visible);
            }
            if (items.length === 0) return null;
            return (
              <ol key={bi} className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-600">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );
          }

          case "callout": {
            const [visible, used] = takeWords(block.text, remaining);
            if (used === 0) return null;
            use(used);
            return (
              <div
                key={bi}
                className="rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-2.5 text-[13px] font-semibold text-blue-800"
              >
                {renderInline(visible)}
              </div>
            );
          }

          case "paragraph": {
            const [visible, used] = takeWords(block.text, remaining);
            if (used === 0) return null;
            use(used);
            return <p key={bi}>{renderInline(visible)}</p>;
          }
        }
      })}
      {streaming && <span className="text-blue-500">▌</span>}
    </div>
  );
}
