import jwt from 'jsonwebtoken'
import { ApiError } from './errors.js'

const issuer = 'campus-portal'
const audience = 'campus-portal-clients'

export function issueToken(userId, secret) {
  return jwt.sign({}, secret, { algorithm: 'HS256', subject: userId, issuer, audience, expiresIn: '1h' })
}

export function authenticate(store, secret) {
  return (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')
    if (!match) return next(new ApiError(401, 'UNAUTHENTICATED', 'A valid Bearer token is required.'))
    try {
      const claims = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer, audience })
      if (typeof claims.sub !== 'string') throw new Error('Invalid subject')
      const user = store.user(claims.sub)
      if (!user) throw new Error('Account no longer exists')
      req.user = user
      next()
    } catch {
      next(new ApiError(401, 'UNAUTHENTICATED', 'The token is invalid or has expired.'))
    }
  }
}

export function requireRole(role) {
  return (req, res, next) => req.user.role === role
    ? next()
    : next(new ApiError(403, 'FORBIDDEN', 'Your account cannot perform this action.'))
}
