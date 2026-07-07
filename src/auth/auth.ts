import { createAccessToken } from './create-access-token'
import { revokeAccessToken } from './revoke-access-token'
import { verifyAccessToken } from './verify-access-token'
import { createUserMailToken } from './create-user-mail-token'
import { verifyUserMailToken } from './verify-user-mail-token'
import { listUserSessions } from './list-user-sessions'
import { revalidateUserPermissions } from './revalidate-user-permissions'
import { revalidateUserPermissionsByRole } from './revalidate-user-permissions-by-role'

export const TOKEN_PLAIN_LENGTH  =  20
export const AUTH_PERMISSION     =  process.env.AUTH_PERMISSION  ===  "true"
export const AUTH_CACHE          =  process.env.AUTH_CACHE       ===  "true"
export const AUTH_CACHE_TTL      =  Number(process.env.AUTH_CACHE_TTL || 600)

export const auth = {
  // =====================================>
  // ## Auth: create access token with user id
  // =====================================>
  createAccessToken,

  // =====================================>
  // ## Auth: delete access token with user id
  // =====================================>
  revokeAccessToken,

  // =====================================>
  // ## Auth: verify access token
  // =====================================>
  verifyAccessToken,

  // =====================================>
  // ## Auth: create user mail token
  // =====================================>
  createUserMailToken,

  // =====================================>
  // ## Auth: Verify user mail token
  // =====================================>
  verifyUserMailToken,

  // =====================================>
  // ## Auth: list user sessions
  // =====================================>
  listUserSessions,

  // =====================================>
  // ## Auth: revalidate user permission
  // =====================================>
  revalidateUserPermissions,
  revalidateUserPermissionsByRole,
}