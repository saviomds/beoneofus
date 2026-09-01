/**
 * Escape a string for safe embedding inside HTML templates.
 * Prevents XSS when user-supplied values are inserted into email bodies or
 * server-rendered HTML strings.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}
