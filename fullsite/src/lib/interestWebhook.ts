/** Same endpoint as the landing page `RegisterSection` (Make.com). */
export const INTEREST_WEBHOOK_URL =
  "https://hook.eu1.make.com/ay8xqbengj94jw74iie1ndy116vw03ba";

export function generateChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}
