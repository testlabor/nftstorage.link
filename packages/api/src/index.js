/* eslint-env serviceworker */

import { Router } from 'itty-router'

import {
  withAccountNotRestricted,
  withApiToken,
  withSuperHotAuthorized,
} from './auth.js'
import { permaCachePut } from './perma-cache/index.js'

import { addCorsHeaders, withCorsHeaders } from './cors.js'
import { errorHandler } from './error-handler.js'
import { envAll } from './env.js'

const router = Router()

const auth = {
  '🤲': (handler) => withCorsHeaders(handler),
  '🔒': (handler) => withCorsHeaders(withApiToken(handler)),
  '🔥': (handler) => withSuperHotAuthorized(handler),
  '🚫': (handler) => withAccountNotRestricted(handler),
}

router
  .all('*', envAll)
  .put('/perma-cache/:url', auth['🔒'](auth['🚫'](auth['🔥'](permaCachePut))))

/**
 * @param {Error} error
 * @param {Request} request
 * @param {import('./env').Env} env
 */
function serverError(error, request, env) {
  return addCorsHeaders(request, errorHandler(error, env))
}

// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
/** @typedef {{ waitUntil(p: Promise): void }} Ctx */

export default {
  async fetch(request, env, ctx) {
    try {
      const res = await router.handle(request, env, ctx)
      env.log.timeEnd('request')
      return env.log.end(res)
    } catch (error) {
      if (env.log) {
        env.log.timeEnd('request')
        return env.log.end(serverError(error, request, env))
      }
      return serverError(error, request, env)
    }
  },
}
