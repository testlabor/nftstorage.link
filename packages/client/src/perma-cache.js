/**
 * A client library for the https://api.nftstorage.link/ perma-cache service. It provides a convenient
 * interface for working with the [Raw HTTP API](https://nftstorage.link/#api-docs)
 * from a web browser or [Node.js](https://nodejs.org/) and comes bundled with
 * TS for out-of-the box type inference and better IntelliSense.
 *
 * @example
 * ```js
 * import { PermaCache } from 'nftstorage.link'
 * // TODO
 * ```
 * @module
 */

import throttledQueue from 'throttled-queue'
import pSettle from 'p-settle'
import pRetry from 'p-retry'

const MAX_PUT_RETRIES = 5
// These match what is enforced server-side
const RATE_LIMIT_REQUESTS = 100
const RATE_LIMIT_PERIOD = 60 * 1000

/** @typedef { import('./lib/interface.js').RateLimiter } RateLimiter */
/** @typedef { import('./lib/interface.js').Service } Service */
/** @typedef { import('./lib/interface.js').PutOptions} PutOptions */
/** @typedef { import('./lib/interface.js').ListOptions} ListOptions */
/** @typedef { import('./lib/interface.js').PermaCacheEntry} PermaCacheEntry */

/**
 * Creates a rate limiter which limits at the same rate as is enforced
 * server-side, to allow the client to avoid exceeding the requests limit and
 * being blocked for 30 seconds.
 * @returns {RateLimiter}
 */
export function createRateLimiter() {
  const throttle = throttledQueue(RATE_LIMIT_REQUESTS, RATE_LIMIT_PERIOD)
  return () => throttle(() => {})
}

/**
 * Rate limiter used by static API if no rate limiter is passed. Note that each
 * instance of the Web3Storage class gets it's own limiter if none is passed.
 * This is because rate limits are enforced per API token.
 */
const globalRateLimiter = createRateLimiter()

/**
 * @implements Service
 */
export class PermaCache {
  /**
   * Constructs a client bound to the given `options.token` and
   * `options.endpoint`.
   *
   * @example
   * ```js
   * import { Web3Storage } from 'web3.storage'
   * const client = new Web3Storage({ token: API_TOKEN })
   * ```
   *
   * @param {{token: string, endpoint?:URL, rateLimiter?: RateLimiter}} options
   */
  constructor({
    token,
    endpoint = new URL('https://api.nftstorage.link'),
    rateLimiter,
  }) {
    /**
     * Authorization token.
     *
     * @readonly
     */
    this.token = token
    /**
     * Service API endpoint `URL`.
     * @readonly
     */
    this.endpoint = endpoint
    /**
     * @readonly
     */
    this.rateLimiter = rateLimiter || createRateLimiter()
  }

  /**
   * @hidden
   * @param {string} token
   * @returns {Record<string, string>}
   */
  static headers(token) {
    if (!token) throw new Error('missing token')
    return {
      Authorization: `Bearer ${token}`,
      'X-Client': 'nftstorage.link/js',
    }
  }

  /**
   * @param {Service} service
   * @param {string[]} urls
   * @param {PutOptions} [options]
   * @returns {Promise<PermaCacheEntry[]>}
   */
  static async put(
    { endpoint, token, rateLimiter = globalRateLimiter },
    urls,
    { onCachedUrl, maxRetries = MAX_PUT_RETRIES } = {}
  ) {
    // TODO: Validate all URLs are valid nftstorage.link URLs
    const headers = PermaCache.headers(token)

    const responses = await pSettle(
      urls.map(async (url) => {
        const apiUrl = new URL(
          `perma-cache/${encodeURIComponent(url)}`,
          endpoint
        )

        await rateLimiter()
        const request = await fetch(apiUrl.toString(), {
          method: 'POST',
          headers,
        })

        const res = await request.json()
        if (!request.ok) {
          // TODO Abort if auth error
          throw new Error(res.message)
        }

        onCachedUrl(url)

        return res
      })
    )

    return responses
  }

  /**
   * @param {Service} service
   * @param {Iterable<string>} urls
   * @param {ListOptions} [options]
   * @returns {Promise<PermaCacheEntry[]>}
   */
  static async list(
    { endpoint, token, rateLimiter = globalRateLimiter },
    { size, page = 0 } = {}
  ) {
    const url = new URL('perma-cache/', endpoint)
    const headers = PermaCache.headers(token)

    await rateLimiter()
    // TODO: Add size, page
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    const result = await response.json()
    if (!result.ok) {
      throw new Error(result.error.message)
    }

    return result
  }

  /**
   * @param {Service} service
   * @param {Iterable<string>} urls
   */
  static async delete(
    { endpoint, token, rateLimiter = globalRateLimiter },
    urls
  ) {}

  static async status({ endpoint, token, rateLimiter = globalRateLimiter }) {}

  // Just a sugar so you don't have to pass around endpoint and token around.

  /**
   * Perma cache URLS into nftstorage.link.
   *
   * Returns the corresponding TODO
   *
   * @example
   * ```js
   * // TODO
   * ```
   * @param {string[]} urls
   * @param {PutOptions} [options]
   */
  put(urls, options) {
    return PermaCache.put(this, urls, options)
  }

  /**
   * List all Perma cached URLs for this account. Use a `for await...of` loop to fetch them all.
   * @example
   * Fetch all the urls
   * ```js
   * const urls = []
   * for await (const item of client.list()) {
   *    urls.push(item)
   * }
   * ```
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
   * @param {object} [opts]
   * @param {string} [opts.cursor] list items from cursor.
   * @param {number} [opts.maxResults] maximum number of results to return.
   * @returns {AsyncIterable<PermaCacheEntry>}
   */
  list(opts) {
    return PermaCache.list(this, opts)
  }

  /**
   * @param {Iterable<string>} urls
   */
  delete(urls) {
    return PermaCache.delete(this, urls)
  }

  /**
   * Fetch info on PermaCache for the user.
   */
  status() {
    return PermaCache.status(this)
  }
}
