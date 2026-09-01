/**
 * Lightweight server-side HTML sanitizer for AI-generated lesson/exam content.
 *
 * This is intentionally simple: AI output follows a known, controlled structure
 * (headings, paragraphs, code blocks, lists). We strip the small set of tags that
 * can execute script or load external resources, rather than attempting to parse
 * all possible HTML — an approach that is both faster and less error-prone for
 * this specific use case.
 *
 * For user-generated content rendered publicly, install and use DOMPurify instead.
 */

// Tags that can run script, embed external content, or hijack the page.
const DANGEROUS_TAGS = [
  'script', 'style', 'iframe', 'frame', 'frameset',
  'object', 'embed', 'applet', 'base', 'form',
  'input', 'button', 'textarea', 'select',
  'link', 'meta', 'svg', 'math',
];

const DANGEROUS_TAG_RE = new RegExp(
  `<\\/?(?:${DANGEROUS_TAGS.join('|')})[^>]*>`,
  'gi'
);

// Inline event handlers (onclick, onload, onerror, …) and javascript: URIs.
const DANGEROUS_ATTR_RE = /\s(?:on\w+|formaction|action|srcdoc)\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_HREF_RE = /\shref\s*=\s*["']\s*javascript:[^"'"']*/gi;

/**
 * Strip executable content from an HTML string.
 * Returns the cleaned string.
 *
 * @param {string} html — raw HTML from AI generation
 * @returns {string}
 */
export function stripDangerousHtml(html) {
  if (typeof html !== 'string' || !html) return '';

  return html
    .replace(DANGEROUS_TAG_RE, '')        // remove dangerous element tags
    .replace(DANGEROUS_ATTR_RE, '')       // remove event handlers and dangerous attributes
    .replace(JAVASCRIPT_HREF_RE, '');     // remove javascript: URIs in hrefs
}
