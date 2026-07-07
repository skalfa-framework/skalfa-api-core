import { Elysia } from 'elysia'
import { auth } from '@utils'

export const Auth = (app: Elysia) => app.derive(async ({ request }) => {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) return { user: null, permissions: [], token: null }

  const bearer = authHeader.substring(7).trim()
  const result = await auth.verifyAccessToken(bearer, request)

  if (!result) return { user: null, permissions: [], token: null };

  return {
    user: result.user,
    permissions: result.token.permissions,
    token: result.token,
  }
})
