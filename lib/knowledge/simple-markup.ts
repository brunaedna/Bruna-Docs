export type InlineSegment = {
  type: "text" | "strong";
  content: string;
};

export type MarkupBlock =
  | { type: "paragraph"; content: InlineSegment[] }
  | { type: "heading"; level: 1 | 2 | 3; content: InlineSegment[] }
  | {
      type: "unordered-list" | "ordered-list";
      items: InlineSegment[][];
    };

const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const UNORDERED_ITEM_PATTERN = /^[-*]\s+(.+)$/;
const ORDERED_ITEM_PATTERN = /^\d+[.)]\s+(.+)$/;

export function parseInlineMarkup(content: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ type: "text", content: content.slice(cursor, index) });
    }
    segments.push({ type: "strong", content: match[1] });
    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    segments.push({ type: "text", content: content.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content }];
}

export function parseSimpleMarkup(content: string): MarkupBlock[] {
  const blocks: MarkupBlock[] = [];
  const paragraphLines: string[] = [];
  let activeList: Extract<
    MarkupBlock,
    { type: "unordered-list" | "ordered-list" }
  > | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({
      type: "paragraph",
      content: parseInlineMarkup(paragraphLines.join(" ")),
    });
    paragraphLines.length = 0;
  };

  const flushList = () => {
    if (activeList) blocks.push(activeList);
    activeList = null;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: parseInlineMarkup(heading[2]),
      });
      continue;
    }

    const unorderedItem = line.match(UNORDERED_ITEM_PATTERN);
    const orderedItem = line.match(ORDERED_ITEM_PATTERN);
    const listType = unorderedItem
      ? "unordered-list"
      : orderedItem
        ? "ordered-list"
        : null;
    const item = unorderedItem?.[1] ?? orderedItem?.[1];

    if (listType && item) {
      flushParagraph();
      if (activeList?.type !== listType) flushList();
      activeList ??= { type: listType, items: [] };
      activeList.items.push(parseInlineMarkup(item));
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
