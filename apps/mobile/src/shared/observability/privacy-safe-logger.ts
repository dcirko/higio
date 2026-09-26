type TechnicalContext = Record<
  string,
  boolean | number | string | null | undefined
>;

function sanitizedErrorName(error: unknown) {
  return error instanceof Error ? error.name : 'UnknownError';
}

export const privacySafeLogger = {
  error(event: string, error: unknown, context?: TechnicalContext) {
    if (__DEV__ && process.env.NODE_ENV !== 'test') {
      console.error(`[Higio] ${event}`, {
        ...context,
        errorName: sanitizedErrorName(error),
      });
    }
  },
  metric(event: string, durationMs: number, context?: TechnicalContext) {
    if (__DEV__ && process.env.NODE_ENV !== 'test') {
      console.info(`[Higio] ${event}`, {
        ...context,
        durationMs: Math.round(durationMs),
      });
    }
  },
};
