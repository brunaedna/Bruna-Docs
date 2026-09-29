import { expect, test } from "@playwright/test";

test("adiciona um documento e responde com a fonte utilizada", async ({
  page,
}) => {
  await page.route("**/api/ask", async (route) => {
    const request = route.request().postDataJSON();
    const document = request.documents[0];
    await route.fulfill({
      json: {
        answer: "O atendimento funciona de segunda a sexta, das 9h às 18h.",
        sources: [
          {
            documentId: document.id,
            title: document.title,
            excerpt: "Atendimento: segunda a sexta, das 9h às 18h.",
            location: "Documento enviado",
            score: 1,
          },
        ],
      },
    });
  });

  await page.goto("/");
  await page.locator("#file-upload").setInputFiles({
    name: "horarios.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Atendimento: segunda a sexta, das 9h às 18h."),
  });

  await expect(page.getByText("“horarios” foi adicionado.")).toBeVisible();
  await page
    .getByLabel("Pergunta para a base de conhecimento")
    .fill("Qual é o horário de atendimento?");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();

  await expect(
    page.getByText("O atendimento funciona de segunda a sexta, das 9h às 18h."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "horarios" })).toBeVisible();
  await expect(
    page.getByText("Atendimento: segunda a sexta, das 9h às 18h."),
  ).toBeVisible();
});
