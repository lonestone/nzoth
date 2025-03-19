import type { ZodError } from 'zod'
import { BadRequestException, HttpStatus, InternalServerErrorException } from '@nestjs/common'

// Exception classes
export class ZodValidationException extends BadRequestException {
  constructor(private readonly error: ZodError) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed',
      errors: error.errors,
    })
  }

  public getZodError(): ZodError {
    return this.error
  }
}

export class ZodSerializationException extends InternalServerErrorException {
  constructor(private readonly error: ZodError) {
    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Serialization failed',
      errors: error.errors,
    })
  }

  public getZodError(): ZodError {
    return this.error
  }
}
