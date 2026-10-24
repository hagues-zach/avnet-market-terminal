// Is every figure in Claude's text one the app gave it? Pure; used to drop QBR
// talking points with a number the brief doesn't contain, and by the Ask the
// Terminal and QBR evals. Years and small counts (one to ten) are left out: they
// read as words more than figures.

/** Numbers as they appear in text, reduced to digits and a decimal point: "$1.21B" and "1.21" both give "1.21". */
export function numbers(text: string): string[] {
  return [...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, "")).filter((n) => !/^(19|20)\d\d$/.test(n));
}

/** The numbers in text that don't appear in the evidence (anything the model was given, as text). */
export function ungrounded(text: string, evidence: string): string[] {
  const known = new Set(numbers(evidence));
  return numbers(text).filter((n) => (Number(n) > 10 || n.includes(".")) && !known.has(n));
}
