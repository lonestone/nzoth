import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'
import { Catch } from '@nestjs/common'
import { ZodSerializationException, ZodValidationException } from './validation.exception'

@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        errors: exception.getZodError().errors,
      })
  }
}

@Catch(ZodSerializationException)
export class ZodSerializationExceptionFilter implements ExceptionFilter {
  catch(exception: ZodSerializationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const request = ctx.getRequest<Request>()

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        errors: exception.getZodError().errors,
      })
  }
}
