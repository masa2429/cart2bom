/**
 * Returns the URL only when it is HTTPS.
 *
 * Shared and imported lists come from outside the browser, so their URLs must
 * never reach an `href` unchecked. A `javascript:` value would otherwise run in
 * the store page's origin when the user clicks the product link.
 */
export function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function isHttpsUrl(value: unknown): value is string {
  return typeof value === "string" && safeHttpsUrl(value) !== null;
}
