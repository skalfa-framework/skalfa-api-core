import { Elysia } from 'elysia'
import { context } from '@utils'

export const ContextMiddleware = (app: Elysia) => app.derive(async ({ store }) => {
  const userId = (store as any)?.user?.id

  context.init({
    user_id  :  userId,
  })
})
