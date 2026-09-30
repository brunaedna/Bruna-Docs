import type { InlineSegment } from "@/lib/knowledge/simple-markup";
import { parseSimpleMarkup } from "@/lib/knowledge/simple-markup";

type FormattedMessageProps = {
  content: string;
  className?: string;
};

function InlineContent({ segments }: { segments: InlineSegment[] }) {
  return segments.map((segment, index) =>
    segment.type === "strong" ? (
      <strong key={index} className="font-semibold text-[#3f3789]">
        {segment.content}
      </strong>
    ) : (
      segment.content
    ),
  );
}

export function FormattedMessage({
  content,
  className,
}: FormattedMessageProps) {
  const blocks = parseSimpleMarkup(content);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <p key={index} className="font-semibold text-[#302f48]">
              <InlineContent segments={block.content} />
            </p>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={index}>
              <InlineContent segments={block.content} />
            </p>
          );
        }

        const List = block.type === "ordered-list" ? "ol" : "ul";
        return (
          <List
            key={index}
            className={`space-y-1 pl-5 ${block.type === "ordered-list" ? "list-decimal" : "list-disc"}`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="pl-1">
                <InlineContent segments={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
