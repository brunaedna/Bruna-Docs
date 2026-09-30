export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator ? dotProduct / denominator : 0;
}

function tokenize(value: string) {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) ?? [],
  );
}

export function lexicalSimilarity(query: string, document: string) {
  const queryTokens = tokenize(query);
  if (!queryTokens.size) return 0;
  const documentTokens = tokenize(document);
  let matches = 0;

  for (const token of queryTokens) {
    if (documentTokens.has(token)) matches += 1;
  }

  return matches / queryTokens.size;
}
