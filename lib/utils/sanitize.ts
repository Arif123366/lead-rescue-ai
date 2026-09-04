/**
 * lib/utils/sanitize.ts
 * Enterprise Input Sanitization Helper
 * Strips HTML tags, script tags, and dangerous characters to prevent XSS attacks.
 */

export function sanitizeString(input: any): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input);
  }

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .replace(/javascript:/gi, '') // Strip javascript: URLs
    .replace(/onload=/gi, '') // Strip inline event handlers
    .replace(/onerror=/gi, '')
    .trim();
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

export default { sanitizeString, sanitizeObject };
