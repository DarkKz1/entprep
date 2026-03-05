import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    sampleRate: 1.0,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, { extra: context });
}

export function setUser(id: string | null): void {
  if (!DSN) return;
  Sentry.setUser(id ? { id } : null);
}
