export class ApplicationError extends Error {
  readonly statusCode: number
  readonly code?: string
  readonly hint?: string

  constructor(
    message: string,
    statusCode = 400,
    extras?: { code?: string; hint?: string },
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = extras?.code
    this.hint = extras?.hint
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toPayload() {
    return {
      error: this.message,
      ...(this.code ? { code: this.code } : {}),
      ...(this.hint ? { hint: this.hint } : {}),
    }
  }
}
