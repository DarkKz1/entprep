// Plausible Analytics — custom event tracking
// Usage: trackEvent('Test Completed', { subject: 'physics', score: 85 })
// Pageviews are tracked automatically by the script tag in index.html.

export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  try {
    const plausible = (window as unknown as { plausible?: (name: string, opts?: { props: Record<string, string | number | boolean> }) => void }).plausible;
    if (typeof plausible === 'function') {
      plausible(name, props ? { props } : undefined);
    }
  } catch { /* analytics should never break the app */ }
}
