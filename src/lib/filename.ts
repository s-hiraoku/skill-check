/** Sanitize untrusted skill names for Content-Disposition / download filenames. */
export function sanitizeFilename(name: string, fallback = "skill"): string {
  const cleaned = name
    .replace(/[\r\n\0]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}
