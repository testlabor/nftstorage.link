export interface Service {
  endpoint: URL
  token: string
  rateLimiter?: RateLimiter
}

/**
 * RateLimiter returns a promise that resolves when it is safe to send a request
 * that does not exceed the rate limit.
 */
export interface RateLimiter {
  (): Promise<void>
}
