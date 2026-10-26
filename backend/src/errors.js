export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function badRequest(message) {
  throw new ApiError(400, 'INVALID_INPUT', message)
}

export function conflict(message) {
  throw new ApiError(409, 'CONFLICT', message)
}

export function notFound() {
  throw new ApiError(404, 'NOT_FOUND', 'The requested record was not found.')
}
