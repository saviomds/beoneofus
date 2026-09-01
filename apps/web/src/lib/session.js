"use client";

const SESSION_KEY = "bou_sid";

export function getSessionId() {
  if (typeof window === "undefined") return null;
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    // crypto.randomUUID() is cryptographically secure and available in all modern browsers
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function appendSessionId(url) {
  if (typeof window === "undefined") return url;
  const sid = getSessionId();
  if (!sid) return url;
  const separator = url.includes("?") ? "&" : "?";
  if (url.includes("sid=")) return url;
  return `${url}${separator}sid=${sid}`;
}

export function trackPageView(userId, path) {
  if (typeof window === "undefined" || !userId) return;
  const sid = getSessionId();
  fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, type: "page_view", content: path, metadata: { sid } }),
  }).catch(() => {});
}
