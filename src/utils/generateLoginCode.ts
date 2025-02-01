export function generateLoginCode() {
  return Math.floor(Math.random() * 1_000_000);
}
