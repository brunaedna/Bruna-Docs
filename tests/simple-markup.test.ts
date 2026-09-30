import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInlineMarkup,
  parseSimpleMarkup,
} from "../lib/knowledge/simple-markup.ts";

test("transforma ênfase forte sem interpretar HTML do documento", () => {
  assert.deepEqual(parseInlineMarkup("**Perfil:** <script>alert(1)</script>"), [
    { type: "strong", content: "Perfil:" },
    { type: "text", content: " <script>alert(1)</script>" },
  ]);
});

test("organiza parágrafos, títulos e listas simples", () => {
  assert.deepEqual(
    parseSimpleMarkup(
      [
        "### Resumo",
        "",
        "Com base no documento:",
        "- **Perfil:** Desenvolvedora Full Stack",
        "- **Formação:** Engenharia de Software",
        "",
        "1. React",
        "2. Node.js",
      ].join("\n"),
    ),
    [
      {
        type: "heading",
        level: 3,
        content: [{ type: "text", content: "Resumo" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", content: "Com base no documento:" }],
      },
      {
        type: "unordered-list",
        items: [
          [
            { type: "strong", content: "Perfil:" },
            { type: "text", content: " Desenvolvedora Full Stack" },
          ],
          [
            { type: "strong", content: "Formação:" },
            { type: "text", content: " Engenharia de Software" },
          ],
        ],
      },
      {
        type: "ordered-list",
        items: [
          [{ type: "text", content: "React" }],
          [{ type: "text", content: "Node.js" }],
        ],
      },
    ],
  );
});
