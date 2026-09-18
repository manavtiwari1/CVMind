// Queue workers retry RetryableError with backoff; FatalError goes straight to the dead-letter state
export class RetryableError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, { cause });
    this.name = 'RetryableError';
    this.retryable = true;
    this.code = code;
  }
}

export class FatalError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, { cause });
    this.name = 'FatalError';
    this.retryable = false;
    this.code = code;
  }
}

// Thrown when a rate limit is hit; the job is rescheduled for retryAt without using up an attempt
export class RateLimitDeferral extends Error {
  constructor(retryAt, message = 'Rate limit reached') {
    super(message);
    this.name = 'RateLimitDeferral';
    this.retryAt = retryAt;
    this.code = 'RATE_LIMITED';
  }
}
