// ── fetch with a hard timeout ────────────────────────────────────────────────
// A stalled third party (Resend, Paystack, the exchange-rate API, …) must never
// hang a serverless function until Vercel's function limit — that surfaces to
// users as a 504 FUNCTION_INVOCATION_TIMEOUT. This wrapper aborts the request
// after `timeoutMs` so the call fails fast and the route's existing try/catch
// (or `!res.ok` handling) can respond gracefully.
//
// Drop-in for `fetch`: same (url, options) signature, plus an optional third
// `timeoutMs` arg (default 10s). Any caller-supplied AbortSignal is respected —
// whichever fires first wins.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();

  // Chain a caller-provided signal so their cancellation still works.
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener?.('abort', onAbort);
  }
}

export default fetchWithTimeout;
