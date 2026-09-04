/**
 * UUID generation utility.
 * Uses native crypto.randomUUID() everywhere (Node 19+ and modern browsers).
 * The named export is kept for backward compatibility with existing API routes.
 */
export function cryptoNativeOrRandomUUID(): string {
  return crypto.randomUUID();
}
