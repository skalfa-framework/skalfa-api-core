import { Elysia } from 'elysia'
import { logger } from '@utils'
import { errors } from './middleware'

export const ErrorHandler = (app: Elysia) => app.onError(({ code, set, error, request }) => {
  const err = error as any

  if (err.name === 'NotFoundError' || err.message === 'Record not found') {
    set.status = 404

    return { message: err.message }
  }


  if (code === 'NOT_FOUND') {
    set.status = errors.notfound.status

    return { message:  errors.notfound.message }
  }

  if (code === 'INTERNAL_SERVER_ERROR') {
    set.status = errors.error.status
    const em = error.message
    const url = new URL(request.url)
    const path = url.pathname

    logger.error(`error: ${em}`, { error: em, reference: path })

    return { message: em }
  }
})
